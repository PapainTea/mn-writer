import type { JSONContent } from '@tiptap/core'
import { normalizeContent } from './normalizeCard'

const MAX_FILE_LENGTH = 5_000_000

export function parseDocumentFile(text: string): JSONContent {
  if (text.length > MAX_FILE_LENGTH) {
    throw new Error('文件超过 5 MB，无法导入')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON 内容不是文稿')
  }

  const document = parsed as JSONContent
  if (document.type !== 'doc' || !Array.isArray(document.content)) {
    throw new Error('JSON 内容不是文稿')
  }

  return normalizeContent(document)
}

export function documentTitleFromFile(filename: string): string {
  return filename.replace(/\.json$/i, '').trim() || '导入文稿'
}
