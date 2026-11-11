import type { CardKind, MnCard } from '../types'
import { callBridge, readCapabilities, type Capabilities } from './client'
import { cardTexts, readComments, readExcerpt, readRichHtml } from './cardText'
import { collectMedia, type MediaPart } from './cardMedia'
import { callNative, nativeBridgeAvailable } from './native'
import { loadCitekeyIndex } from './zoteroIndex'
import { readZoteroMeta } from './zoteroMeta'

interface MindNode {
  noteid: string
  title?: string
  preview?: string
  depth?: number
  docPage?: number
  docBookmd5?: string
}

interface TreePage {
  nodes?: MindNode[]
  nextCursor?: string | null
  walkLimitReached?: boolean
  nodeTotal?: number
}

interface DocumentItem {
  bookmd5?: string
  title?: string
}

export interface DocumentList {
  items?: DocumentItem[]
}

interface TextItem {
  index: number
  text?: string
  excerpt?: boolean
  kind?: string
}

export interface NoteItem {
  noteid?: string
  found?: boolean
  title?: string
  preview?: string
  texts?: TextItem[]
  parts?: MediaPart[]
  comments?: Array<{ text?: string; type?: string }>
  hashtags?: string[]
  metadata?: { colorIndex?: number }
  sourceAnchor?: { page?: number | null; bookmd5?: string; hasExcerpt?: boolean }
  addonValues?: Record<string, unknown>
  hasInk?: boolean
}

export interface BatchResult {
  items?: NoteItem[]
}

const TREE_PAGE_LIMIT = 500
const TREE_MAX_PAGES = 40
const NOTE_BATCH_LIMIT = 200

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

async function loadTree(topicId: string): Promise<{ nodes: MindNode[]; truncated: boolean }> {
  const nodes: MindNode[] = []
  const seen = new Set<string>()
  let cursor: string | null = null
  let truncated = false

  for (let page = 0; page < TREE_MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ sort: 'document', limit: String(TREE_PAGE_LIMIT) })
    if (cursor) params.set('cursor', cursor)
    const result = await callBridge<TreePage>(
      `/study-sets/${encodeURIComponent(topicId)}/tree?${params.toString()}`,
    )
    for (const node of result.nodes ?? []) {
      if (!node.noteid || seen.has(node.noteid)) continue
      seen.add(node.noteid)
      nodes.push(node)
    }
    if (result.walkLimitReached) truncated = true
    cursor = result.nextCursor ?? null
    if (!cursor) break
    if (page === TREE_MAX_PAGES - 1) truncated = true
  }

  return { nodes, truncated }
}

async function loadDocuments(topicId: string): Promise<DocumentItem[]> {
  try {
    const result = await callBridge<DocumentList>(
      `/study-sets/${encodeURIComponent(topicId)}/documents`,
    )
    return result.items ?? []
  } catch {
    return []
  }
}

async function batchGet(noteIds: string[], batchSize: number): Promise<NoteItem[]> {
  const batches = chunk(noteIds, Math.min(Math.max(batchSize, 1), NOTE_BATCH_LIMIT))
  const results = await Promise.all(
    batches.map((group) =>
      callBridge<BatchResult>('/notes/batch-get', {
        method: 'POST',
        body: { noteIds: group, addons: ['*'], comments: true },
      }),
    ),
  )
  return results.flatMap((result) => result.items ?? [])
}

export async function loadCitationKeys(): Promise<Record<string, string>> {
  if (!nativeBridgeAvailable()) return {}
  const values: Record<string, string> = {}
  try {
    const result = await callNative<{ values?: Record<string, string> }>('citekey:list')
    Object.assign(values, result?.values ?? {})
  } catch {
    // 读不到共享缓存时只用 Zotero 索引。
  }
  const index = await loadCitekeyIndex()
  return { ...values, ...index }
}

function readCitationKey(
  card: NoteItem,
  citekeys: Record<string, string> = {},
  docMd5?: string,
): string | undefined {
  for (const value of Object.values(card.addonValues ?? {})) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as { citationKey?: string }
        if (parsed?.citationKey) return parsed.citationKey
      } catch {
        // 非 JSON 的插件字段按普通文本跳过。
      }
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      if (typeof record.citationKey === 'string') return record.citationKey
      if (typeof record.zoteroKey === 'string') return record.zoteroKey
    }
  }
  const meta = readZoteroMeta(cardTexts(card))
  if (meta?.citationKey) return meta.citationKey
  if (meta?.itemKey && citekeys[meta.itemKey]) return citekeys[meta.itemKey]
  if (meta?.docMd5 && citekeys[meta.docMd5]) return citekeys[meta.docMd5]
  if (docMd5 && citekeys[docMd5]) return citekeys[docMd5]
  const tag = card.hashtags?.find((item) => item.startsWith('cite:'))
  return tag?.slice('cite:'.length)
}

function readKind(card: NoteItem): CardKind {
  if (card.hashtags?.some((tag) => tag === '文献' || tag.startsWith('kind/literature'))) {
    return 'literature'
  }
  if (card.sourceAnchor?.hasExcerpt || card.texts?.some((item) => item.excerpt)) {
    return 'excerpt'
  }
  return 'note'
}

/**
 * 卡片标题。
 *
 * `items[].title` 是完整的显示标题，卡片没有标题时为空串。
 * `preview` 是正文首段的兜底，不能充当标题，
 * 因此只有接口没有返回标题字段时才退回脑图节点。
 */
function readTitle(card: NoteItem, node: MindNode | undefined): string {
  if (typeof card.title === 'string') return card.title.trim()
  return (node?.title ?? '').trim()
}

/** 宿主的显示预览：有标题时是标题，没有标题时取正文首段。 */
function readPreview(card: NoteItem, node: MindNode | undefined): string {
  if (typeof card.preview === 'string') return card.preview.trim()
  return (node?.preview ?? '').trim()
}

function toCard(
  card: NoteItem,
  node: MindNode | undefined,
  docTitle: string | undefined,
  citekeys: Record<string, string> = {},
  docMd5?: string,
): MnCard {
  const page = card.sourceAnchor?.page ?? node?.docPage
  const excerpt = readExcerpt(card)
  const richHtml = readRichHtml(card)
  const media = collectMedia(card.parts, [...cardTexts(card), excerpt, richHtml ?? ''])
  return {
    id: card.noteid ?? node?.noteid ?? '',
    title: readTitle(card, node),
    preview: readPreview(card, node),
    excerpt,
    excerptHtml: richHtml,
    media: media.items,
    comments: readComments(card, excerpt),
    tags: card.hashtags ?? [],
    page: typeof page === 'number' ? page : undefined,
    documentTitle: docTitle,
    citationKey: readCitationKey(card, citekeys, docMd5),
    colorIndex: card.metadata?.colorIndex,
    kind: readKind(card),
  }
}

export async function loadStudySetCards(
  topicId: string,
  capabilities: Capabilities,
): Promise<{ cards: MnCard[]; truncated: boolean }> {
  const [tree, documents] = await Promise.all([loadTree(topicId), loadDocuments(topicId)])
  if (tree.nodes.length === 0) return { cards: [], truncated: tree.truncated }

  const nodeById = new Map(tree.nodes.map((node) => [node.noteid, node]))
  const docTitles = new Map(
    documents
      .filter((item): item is DocumentItem & { bookmd5: string } => Boolean(item.bookmd5))
      .map((item) => [item.bookmd5, item.title ?? '']),
  )

  const batchSize = capabilities.noteMetadata?.maxNoteIds ?? NOTE_BATCH_LIMIT
  const [items, citekeys] = await Promise.all([
    batchGet(
      tree.nodes.map((node) => node.noteid),
      batchSize,
    ),
    loadCitationKeys(),
  ])

  const cards: MnCard[] = []
  for (const item of items) {
    if (!item.found || !item.noteid) continue
    const node = nodeById.get(item.noteid)
    const bookmd5 = item.sourceAnchor?.bookmd5 ?? node?.docBookmd5
    cards.push(
      toCard(item, node, bookmd5 ? docTitles.get(bookmd5) : undefined, citekeys, bookmd5),
    )
  }
  return { cards, truncated: tree.truncated }
}

export async function loadCards(
  noteIds: string[],
  topicId?: string,
): Promise<MnCard[]> {
  const unique = [...new Set(noteIds.filter(Boolean))]
  if (unique.length === 0) return []

  const capabilities = await readCapabilities()
  const batchSize = capabilities.noteMetadata?.maxNoteIds ?? NOTE_BATCH_LIMIT
  const [items, documents, citekeys] = await Promise.all([
    batchGet(unique, batchSize),
    topicId ? loadDocuments(topicId) : Promise.resolve<DocumentItem[]>([]),
    loadCitationKeys(),
  ])

  const docTitles = new Map(
    documents
      .filter((item): item is DocumentItem & { bookmd5: string } => Boolean(item.bookmd5))
      .map((item) => [item.bookmd5, item.title ?? '']),
  )

  const cards: MnCard[] = []
  for (const item of items) {
    if (!item.found || !item.noteid) continue
    const bookmd5 = item.sourceAnchor?.bookmd5
    cards.push(
      toCard(item, undefined, bookmd5 ? docTitles.get(bookmd5) : undefined, citekeys, bookmd5),
    )
  }
  return cards
}
