import { marked } from 'marked'
import DOMPurify from 'dompurify'
import parse from 'html-react-parser'
import type { MnComment } from '../types'

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
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
    'span',
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
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'src', 'alt', 'width', 'height'],
  ALLOWED_URI_REGEXP: /^(?:blob:|data:image\/|https?:\/\/)/i,
}

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_OPTIONS)
}

function renderMarkdown(text: string): string {
  const parsed = marked.parse(text, { async: false, gfm: true, breaks: true })
  return sanitize(typeof parsed === 'string' ? parsed : '')
}

export function renderCommentHtml(comment: MnComment): string {
  if (comment.format === 'html' || comment.format === 'rich') {
    return sanitize(comment.text)
  }
  if (comment.format === 'markdown') {
    return renderMarkdown(comment.text)
  }
  return sanitize(`<p>${comment.text}</p>`)
}

export function CommentBody({ comment, html }: { comment: MnComment; html?: string }) {
  const content = html ?? renderCommentHtml(comment)
  if (!content) return null
  return <span className="mn-comment-body">{parse(content)}</span>
}
