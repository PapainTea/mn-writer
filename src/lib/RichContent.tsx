import DOMPurify from 'dompurify'
import parse from 'html-react-parser'

const ALLOWED_TAGS = [
  'div',
  'span',
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'mark',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'sup',
  'sub',
  'img',
]

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'class', 'src', 'alt', 'width', 'height']

/** 卡片里的图片用取回的地址，blob 与 data 都要放行。 */
const ALLOWED_URI_REGEXP = /^(?:blob:|data:image\/|https?:\/\/)/i

/**
 * 渲染卡片自带的 HTML。
 *
 * Zotero Connect 的卡片使用 `<z>` 作为标签样式，这里统一替换为 span；
 * 样式属性与脚本都会被过滤，避免卡片内容影响写作台本身。
 */
export function sanitizeCardHtml(html: string): string {
  const normalized = String(html ?? '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<z(\s[^>]*)?>/gi, '<span class="mn-zotero-kind"$1>')
    .replace(/<\/z>/gi, '</span>')
    .replace(/\sstyle\s*=\s*"[^"]*"/gi, '')
    .replace(/\sstyle\s*=\s*'[^']*'/gi, '')
  return DOMPurify.sanitize(normalized, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
  })
}

export function RichContent({ html, className }: { html: string; className?: string }) {
  const clean = sanitizeCardHtml(html)
  if (!clean) return null
  return <div className={className}>{parse(clean)}</div>
}
