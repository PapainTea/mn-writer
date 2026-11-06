import type { JSONContent } from '@tiptap/core'
import type { CardKind, CommentFormat, MnCard, MnComment } from '../types'

/** 早期版本把批注保存为 comment 字符串，此处统一迁移为 comments 数组。 */
interface LegacyCard extends Partial<MnCard> {
  comment?: string
}

const KIND_VALUES: CardKind[] = ['excerpt', 'note', 'literature']
const FORMAT_VALUES: CommentFormat[] = ['text', 'markdown', 'html', 'rich']

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

export function normalizeCard(value: unknown): MnCard | null {
  if (!value || typeof value !== 'object') return null
  const card = value as LegacyCard
  if (typeof card.id !== 'string' || card.id.length === 0) return null
  return {
    id: card.id,
    title: typeof card.title === 'string' ? card.title : '',
    excerpt: typeof card.excerpt === 'string' ? card.excerpt : '',
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
