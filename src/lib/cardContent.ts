import type { CommentFormat, MnCard, MnMedia } from '../types'
import { commentToPlainText } from './commentText'
import { compareTextKey, htmlToText, stripMediaRefs } from './htmlText'
import { renderCommentHtml } from './commentRender'

interface TextBlock {
  kind: 'text'
  text: string
  format: CommentFormat
  source: 'excerpt' | 'comment'
}

interface HtmlBlock {
  kind: 'html'
  html: string
  source: 'excerpt' | 'comment'
}

interface MediaBlock {
  kind: 'media'
  media: MnMedia
  source: 'media'
}

export type CardContentBlock = TextBlock | HtmlBlock | MediaBlock

/** 去掉图片内容块，只留下文字内容。 */
export type CardTextBlock = TextBlock | HtmlBlock

/** 判断内容块是不是文字内容。 */
export function isTextBlock(block: CardContentBlock): block is CardTextBlock {
  return block.kind !== 'media'
}

function normalizeKey(text: string): string {
  return compareTextKey(text)
}

function blockText(block: CardContentBlock): string {
  if (block.kind === 'media') return ''
  if (block.kind === 'html') return htmlToText(block.html)
  return block.text
}

export function blockPlainText(block: CardContentBlock): string {
  if (block.kind === 'media') return ''
  if (block.kind === 'html') return htmlToText(block.html)
  return commentToPlainText({ text: block.text, format: block.format })
}

function mediaIdentity(media: MnMedia): string {
  if (media.contentId) return `id:${media.contentId}`
  if (media.hash) return `hash:${media.hash}`
  return ''
}

/** 同一段内容里，保留表达更完整的一份。 */
function preferBlock(current: CardContentBlock, incoming: CardContentBlock): CardContentBlock {
  if (current.kind === 'html' && incoming.kind === 'text') return current
  if (current.kind === 'text' && incoming.kind === 'html') return incoming
  if (current.kind === 'media' || incoming.kind === 'media') return current
  return blockPlainText(incoming).length > blockPlainText(current).length ? incoming : current
}

/**
 * 去掉重复的内容块。
 *
 * 同一段文字可能在卡片正文、摘录与批注里各出现一次，转换与复制时只保留一份。
 */
export function dedupeBlocks(blocks: CardContentBlock[]): CardContentBlock[] {
  const result: CardContentBlock[] = []
  for (const block of blocks) {
    if (block.kind === 'media') {
      const identity = mediaIdentity(block.media)
      if (!identity) continue
      const repeated = result.some(
        (existing) => existing.kind === 'media' && mediaIdentity(existing.media) === identity,
      )
      if (repeated) continue
      result.push(block)
      continue
    }

    const key = normalizeKey(blockText(block))
    if (!key) continue
    const index = result.findIndex((existing) => {
      if (existing.kind === 'media') return false
      const other = normalizeKey(blockText(existing))
      if (!other) return false
      if (other === key) return true
      // 正文被截断时，摘录是批注的前缀，两者只保留更完整的一份。
      if (key.length < other.length) {
        return other.includes(key) && key.length >= other.length * 0.8
      }
      return key.includes(other) && other.length >= key.length * 0.8
    })
    if (index >= 0) {
      const current = result[index]
      if (current) result[index] = preferBlock(current, block)
      continue
    }
    result.push(block)
  }
  return result
}

/** 取出卡片的内容块，摘录、批注与图片按顺序排列。 */
export function cardContentBlocks(card: MnCard): CardContentBlock[] {
  const blocks: CardContentBlock[] = []
  const html = card.excerptHtml?.trim()
  if (html) {
    blocks.push({ kind: 'html', html, source: 'excerpt' })
  } else if (card.excerpt.trim()) {
    const text = stripMediaRefs(card.excerpt)
    if (text) blocks.push({ kind: 'text', text, format: 'text', source: 'excerpt' })
  }
  for (const comment of card.comments) {
    if (comment.format === 'html' || comment.format === 'rich') {
      blocks.push({ kind: 'html', html: comment.text, source: 'comment' })
    } else {
      // 图片由媒体块单独展示，文字块里的引用地址只会在转换时变成噪声。
      const text = stripMediaRefs(comment.text)
      if (text) blocks.push({ kind: 'text', text, format: comment.format, source: 'comment' })
    }
  }
  for (const media of card.media ?? []) {
    blocks.push({ kind: 'media', media, source: 'media' })
  }
  return dedupeBlocks(blocks)
}

/** 卡片内容的纯文本，段落之间空一行。 */
export function cardPlainText(card: MnCard): string {
  return cardContentBlocks(card)
    .map((block) => blockPlainText(block).trim())
    .filter(Boolean)
    .join('\n\n')
}

/** 卡片内容的富文本，用于写入剪贴板。 */
export function cardRichHtml(card: MnCard): string {
  return cardContentBlocks(card)
    .map((block) => {
      if (block.kind === 'media') return ''
      if (block.kind === 'html') return block.html
      return renderCommentHtml({ text: block.text, format: block.format })
    })
    .filter(Boolean)
    .join('\n')
}

/** 卡片内容里是否已经出现过某段文字。 */
export function cardHasText(card: MnCard, text: string): boolean {
  const key = normalizeKey(text)
  if (!key) return false
  return cardContentBlocks(card).some((block) => {
    if (block.kind === 'media') return false
    return normalizeKey(blockText(block)) === key
  })
}
