import type { CommentFormat, MnComment } from '../types'
import { collapseWhitespace, htmlToText, looksLikeHtml, stripLeadingCss } from '../lib/htmlText'

interface TextItem {
  index?: number
  text?: string
  excerpt?: boolean
  kind?: string
}

export interface CardTextSource {
  preview?: string
  texts?: TextItem[]
  parts?: TextItem[]
  comments?: Array<{ text?: string; type?: string }>
}

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

/** 卡片上所有可能携带元数据或 HTML 的文本来源。 */
export function cardTexts(card: CardTextSource): string[] {
  return [
    ...(card.parts ?? []).map((item) => item.text ?? ''),
    ...(card.texts ?? []).map((item) => item.text ?? ''),
    ...(card.comments ?? []).map((item) => item.text ?? ''),
  ]
}

/** 取卡片自身的富文本 HTML；文字项与二进制项都可能是来源。 */
export function readRichHtml(card: CardTextSource): string | undefined {
  const body = [
    ...(card.parts ?? []).map((item) => item.text ?? ''),
    ...(card.texts ?? []).map((item) => item.text ?? ''),
  ]
  return body.find(
    (text) =>
      looksLikeHtml(text) &&
      (/mnzotero-card/i.test(text) || /data-mnzotero-meta/i.test(text) || /<div\b/i.test(text)),
  )
}

export function readExcerpt(card: CardTextSource): string {
  const rich = readRichHtml(card)
  if (rich) {
    const text = htmlToText(rich)
    if (text) return text
  }
  const excerpts = (card.texts ?? []).filter((item) => item.excerpt && item.text?.trim())
  if (excerpts.length > 0) {
    return excerpts
      .map((item) => stripLeadingCss(item.text ?? ''))
      .filter(Boolean)
      .join('\n\n')
  }
  const first = (card.texts ?? [])
    .map((item) => stripLeadingCss(item.text ?? ''))
    .find(Boolean)
  return first ?? card.preview ?? ''
}

export function readComments(card: CardTextSource, excerpt: string): MnComment[] {
  const excerptKey = collapseWhitespace(excerpt)
  return (card.comments ?? [])
    .map((item) => ({
      text: stripLeadingCss(item.text?.trim() ?? ''),
      format: readCommentFormat(item.type),
    }))
    .filter((comment) => comment.text.length > 0)
    .filter((comment) => {
      const plain = collapseWhitespace(htmlToText(comment.text))
      if (!plain) return false
      // HTML 卡片正文会被宿主同时放进批注，重复展示会形成大段重复文字。
      if (/mnzotero-card|data-mnzotero-meta/i.test(comment.text)) return false
      if (
        excerptKey &&
        (plain === excerptKey || excerptKey.startsWith(plain) || plain.startsWith(excerptKey))
      ) {
        return false
      }
      return true
    })
}
