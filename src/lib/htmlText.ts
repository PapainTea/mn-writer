/**
 * HTML 与纯文本之间的转换。
 *
 * MarginNote 的富文本卡片同时提供 HTML 与剥离后的纯文本。纯文本会保留
 * `<style>` 里的 CSS 源码，因此展示前要先去掉样式块与标签。
 */

const ENTITIES: Record<string, string> = {
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
    return ENTITIES[entity.toLowerCase()] ?? match
  })
}

/** 去掉宿主剥离标签后残留的 CSS 规则前缀。 */
export function stripLeadingCss(text: string): string {
  return text.replace(/^\s*(?:[^{}\n]+\{[^{}]*\}\s*)+/, '').trim()
}

/** 判断一段文本是否含有可渲染的 HTML 标签。 */
export function looksLikeHtml(text: string): boolean {
  return /<\/?(?:div|span|p|br|style|table|ul|ol|li|h[1-6]|strong|em|b|i|a|img)\b/i.test(text)
}

/** 把 HTML 转换为可读纯文本，样式块与脚本块整体丢弃。 */
export function htmlToText(html: string): string {
  const source = String(html ?? '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(?:p|div|li|tr|h[1-6])\s*>/gi, '\n')
  if (typeof DOMParser === 'undefined') {
    return stripLeadingCss(decodeEntities(source.replace(/<[^>]*>/g, ' ')))
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  const parsed = new DOMParser().parseFromString(source, 'text/html')
  parsed.querySelectorAll('style, script').forEach((element) => element.remove())
  return stripLeadingCss(parsed.body.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 纯文本统一压缩为单行，供列表摘要使用。 */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** 比较两段文字是否表达同一内容，忽略空白与常见标点。 */
export function compareTextKey(text: string): string {
  return stripMediaRefs(htmlToText(text))
    .replace(/[\s\u3000,.;:!?'"“”‘’()（）[\]【】<>《》\-—_]/g, '')
    .toLowerCase()
}

/**
 * 宿主在卡片正文里记录图片用的地址，形如 `marginnote4app://markdownimg/png/<哈希>`。
 */
const MEDIA_REF_SOURCE = 'marginnote4app://markdownimg/([a-z0-9.+-]+)/([^\\s)"\'<>]+)'

export interface MediaRef {
  hash: string
  mimeType: string
}

const MIME_BY_FORMAT: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
}

/** 取出文本里的图片引用。 */
export function readMediaRefs(text: string): MediaRef[] {
  const refs: MediaRef[] = []
  const seen = new Set<string>()
  const pattern = new RegExp(MEDIA_REF_SOURCE, 'gi')
  let match: RegExpExecArray | null
  while ((match = pattern.exec(String(text ?? ''))) !== null) {
    const hash = match[2] ?? ''
    if (!hash || seen.has(hash)) continue
    seen.add(hash)
    refs.push({ hash, mimeType: MIME_BY_FORMAT[(match[1] ?? '').toLowerCase()] ?? 'image/png' })
  }
  return refs
}

/** 从文本里移除图片引用，剩下的部分才是可读文字。 */
export function stripMediaRefs(text: string): string {
  return String(text ?? '')
    .replace(new RegExp(MEDIA_REF_SOURCE, 'gi'), '')
    .replace(/!\[[^\]]*\]\(\s*\)/g, '')
    .trim()
}
