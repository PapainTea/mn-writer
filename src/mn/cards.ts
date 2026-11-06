import type { CardKind, CommentFormat, MnCard, MnComment } from '../types'
import { callBridge, readCapabilities, type Capabilities } from './client'

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
}

export interface NoteItem {
  noteid?: string
  found?: boolean
  title?: string
  preview?: string
  texts?: TextItem[]
  comments?: Array<{ text?: string; type?: string }>
  hashtags?: string[]
  metadata?: { colorIndex?: number }
  sourceAnchor?: { page?: number | null; bookmd5?: string; hasExcerpt?: boolean }
  addonValues?: Record<string, unknown>
}

export interface BatchResult {
  items?: NoteItem[]
}

const TREE_PAGE_LIMIT = 500
const TREE_MAX_PAGES = 40
const NOTE_BATCH_LIMIT = 200

const COMMENT_FORMATS: Record<string, CommentFormat> = {
  text: 'text',
  plain: 'text',
  markdown: 'markdown',
  md: 'markdown',
  html: 'html',
  rich: 'rich',
}

function readCommentFormat(value: unknown): CommentFormat {
  if (typeof value !== 'string') return 'text'
  return COMMENT_FORMATS[value.toLowerCase()] ?? 'text'
}

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

function readCitationKey(card: NoteItem): string | undefined {
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
  const tag = card.hashtags?.find((item) => item.startsWith('cite:'))
  return tag?.slice('cite:'.length)
}

function readExcerpt(card: NoteItem): string {
  const excerpts = (card.texts ?? []).filter((item) => item.excerpt && item.text?.trim())
  if (excerpts.length > 0) {
    return excerpts.map((item) => item.text?.trim()).filter(Boolean).join('\n\n')
  }
  return (card.texts ?? []).map((item) => item.text?.trim()).find(Boolean) ?? card.preview ?? ''
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

function readComments(card: NoteItem): MnComment[] {
  return (card.comments ?? [])
    .map((item) => ({
      text: item.text?.trim() ?? '',
      format: readCommentFormat(item.type),
    }))
    .filter((comment) => comment.text.length > 0)
}

function toCard(card: NoteItem, node: MindNode | undefined, docTitle: string | undefined): MnCard {
  const page = card.sourceAnchor?.page ?? node?.docPage
  return {
    id: card.noteid ?? node?.noteid ?? '',
    title: card.title?.trim() || node?.title?.trim() || card.preview?.trim() || '未命名卡片',
    excerpt: readExcerpt(card),
    comments: readComments(card),
    tags: card.hashtags ?? [],
    page: typeof page === 'number' ? page : undefined,
    documentTitle: docTitle,
    citationKey: readCitationKey(card),
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
  const items = await batchGet(
    tree.nodes.map((node) => node.noteid),
    batchSize,
  )

  const cards: MnCard[] = []
  for (const item of items) {
    if (!item.found || !item.noteid) continue
    const node = nodeById.get(item.noteid)
    const bookmd5 = item.sourceAnchor?.bookmd5 ?? node?.docBookmd5
    cards.push(toCard(item, node, bookmd5 ? docTitles.get(bookmd5) : undefined))
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
  const [items, documents] = await Promise.all([
    batchGet(unique, batchSize),
    topicId ? loadDocuments(topicId) : Promise.resolve<DocumentItem[]>([]),
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
    cards.push(toCard(item, undefined, bookmd5 ? docTitles.get(bookmd5) : undefined))
  }
  return cards
}
