import type { JSONContent } from '@tiptap/core'
import type { CardKind, CommentFormat, MnCard, MnComment, MnMedia, MnMediaKind } from '../types'

/** 早期版本把批注保存为 comment 字符串，此处统一迁移为 comments 数组。 */
interface LegacyCard extends Partial<MnCard> {
  comment?: string
}

const KIND_VALUES: CardKind[] = ['excerpt', 'note', 'literature']
const FORMAT_VALUES: CommentFormat[] = ['text', 'markdown', 'html', 'rich']
const MEDIA_KIND_VALUES: MnMediaKind[] = ['image', 'handwriting', 'unknown']

function readKind(value: unknown): CardKind {
  return KIND_VALUES.find((kind) => kind === value) ?? 'excerpt'
}

function readFormat(value: unknown): CommentFormat {
  return FORMAT_VALUES.find((format) => format === value) ?? 'text'
}

function readComments(value: LegacyCard): MnComment[] {
  const source = Array.isArray(value.comments) ? value.comments : []
  const comments = source
    .map((item) => ({
      text: typeof item?.text === 'string' ? item.text.trim() : '',
      format: readFormat(item?.format),
    }))
    .filter((comment) => comment.text.length > 0)
  if (comments.length > 0) return comments
  const legacy = typeof value.comment === 'string' ? value.comment.trim() : ''
  return legacy ? [{ text: legacy, format: 'text' }] : []
}

function readMediaKind(value: unknown): MnMediaKind {
  return MEDIA_KIND_VALUES.find((kind) => kind === value) ?? 'unknown'
}

/**
 * 早期版本把标题、正文等文字条目当成了图片。
 *
 * 这些条目指向的不是二进制内容，取回时必然失败，加载旧文稿时直接丢弃。
 */
function isTextContentId(contentId: string): boolean {
  return /^(?:title|sub-\d+-(?:text|blank|rich[_-]?text|html))$/i.test(contentId)
}

/** 卡片上的图片与手写内容，存进文稿后仍要保留。 */
function readMedia(value: unknown): MnMedia[] {
  if (!Array.isArray(value)) return []
  const media: MnMedia[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const contentId = typeof record.contentId === 'string' ? record.contentId : undefined
    const hash = typeof record.hash === 'string' ? record.hash : undefined
    if (!contentId && !hash) continue
    if (contentId && isTextContentId(contentId)) continue
    if (readMediaKind(record.kind) === 'unknown' && !hash) continue
    const identity = contentId ? `id:${contentId}` : `hash:${hash}`
    if (seen.has(identity)) continue
    seen.add(identity)
    media.push({
      contentId,
      hash,
      kind: readMediaKind(record.kind),
      mimeType: typeof record.mimeType === 'string' ? record.mimeType : 'image/png',
      alt: typeof record.alt === 'string' ? record.alt : '图片',
      caption: typeof record.caption === 'string' ? record.caption : undefined,
    })
  }
  return media
}

export function normalizeCard(value: unknown): MnCard | null {
  if (!value || typeof value !== 'object') return null
  const card = value as LegacyCard
  if (typeof card.id !== 'string' || card.id.length === 0) return null
  return {
    id: card.id,
    title: typeof card.title === 'string' ? card.title : '',
    preview: typeof card.preview === 'string' ? card.preview : undefined,
    excerpt: typeof card.excerpt === 'string' ? card.excerpt : '',
    excerptHtml: typeof card.excerptHtml === 'string' ? card.excerptHtml : undefined,
    media: readMedia(card.media),
    comments: readComments(card),
    tags: Array.isArray(card.tags) ? card.tags.filter((tag) => typeof tag === 'string') : [],
    page: typeof card.page === 'number' ? card.page : undefined,
    documentTitle: typeof card.documentTitle === 'string' ? card.documentTitle : undefined,
    citationKey: typeof card.citationKey === 'string' ? card.citationKey : undefined,
    colorIndex: typeof card.colorIndex === 'number' ? card.colorIndex : undefined,
    kind: readKind(card.kind),
    updatedAt: typeof card.updatedAt === 'number' ? card.updatedAt : undefined,
  }
}

function normalizeNode(node: JSONContent): JSONContent {
  const next: JSONContent = { ...node }
  if (node.attrs?.snapshot) {
    const card = normalizeCard(node.attrs.snapshot)
    const cardId =
      typeof node.attrs.cardId === 'string' ? node.attrs.cardId : (card?.id ?? '')
    next.attrs = { ...node.attrs, cardId, snapshot: card }
  }
  if (Array.isArray(node.content)) {
    next.content = node.content.map(normalizeNode)
  }
  return next
}

export function normalizeContent(content: JSONContent): JSONContent {
  return normalizeNode(content)
}
