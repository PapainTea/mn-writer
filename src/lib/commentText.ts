import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { MnComment } from '../types'

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
}

/** 把 HTML 实体还原为普通字符，实体名称大小写不敏感。 */
function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    const named = NAMED_ENTITIES[entity.toLowerCase()]
    return named ?? match
  })
}

/** 去掉标签后保留可读文本，并还原常用实体。 */
function stripTags(html: string): string {
  const withoutTags = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
  return decodeEntities(withoutTags)
}

function markdownToText(text: string): string {
  const parsed = marked.parse(text, { async: false, gfm: true, breaks: true })
  if (typeof parsed !== 'string') return text
  return stripTags(DOMPurify.sanitize(parsed))
}

/** 把一条批注转换为纯文本，Markdown 与 HTML 批注在此处降级为普通文字。 */
export function commentToPlainText(comment: MnComment): string {
  if (comment.format === 'markdown') return markdownToText(comment.text).trim()
  if (comment.format === 'html' || comment.format === 'rich') return stripTags(comment.text).trim()
  return comment.text.trim()
}
