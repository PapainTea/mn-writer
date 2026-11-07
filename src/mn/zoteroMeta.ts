/**
 * Zotero 卡片元数据解析。
 *
 * 元数据有两种落点：HTML 注释标记与卡片根元素上的 `data-mnzotero-meta` 属性。
 * 宿主重写评论时可能丢弃注释，属性仍会保留，因此两种来源都要读取。
 */

export interface ZoteroCardMeta {
  docMd5?: string
  itemKey?: string
  citationKey?: string
}

const META_COMMENT_RE = /<!--mnzotero-card-meta:([\s\S]*?)-->/g
const META_ATTRIBUTE_RE = /\bdata-mnzotero-meta\s*=\s*(?:"([^"]*)"|'([^']*)')/gi

function decodeMetaPayload(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function parseMetaPayload(payload: string | undefined): ZoteroCardMeta | null {
  if (!payload) return null
  const candidates = payload.includes('&') ? [payload, decodeMetaPayload(payload)] : [payload]
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as ZoteroCardMeta
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // 标记损坏时继续尝试下一个候选。
    }
  }
  return null
}

/** 取最后一条合法标记：卡片被重写过多次时，最新的标记才是真源。 */
export function readZoteroMeta(texts: string[]): ZoteroCardMeta | null {
  let latest: ZoteroCardMeta | null = null
  for (const text of texts) {
    META_ATTRIBUTE_RE.lastIndex = 0
    let attribute: RegExpExecArray | null = META_ATTRIBUTE_RE.exec(text)
    while (attribute) {
      const parsed = parseMetaPayload(attribute[1] ?? attribute[2])
      if (parsed) latest = parsed
      attribute = META_ATTRIBUTE_RE.exec(text)
    }
    META_COMMENT_RE.lastIndex = 0
    let comment: RegExpExecArray | null = META_COMMENT_RE.exec(text)
    while (comment) {
      const parsed = parseMetaPayload(comment[1])
      if (parsed) latest = parsed
      comment = META_COMMENT_RE.exec(text)
    }
  }
  return latest
}
