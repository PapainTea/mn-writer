/**
 * 文稿正文文字提取。
 *
 * 术语提取与资料库检索都需要手稿自身的用词，
 * 这里把文稿结构里的文字按顺序拼成纯文本。
 */

import type { JSONContent } from '@tiptap/core'

export function collectManuscriptText(content: JSONContent): string {
  const parts: string[] = []
  const walk = (node: JSONContent): void => {
    if (typeof node.text === 'string' && node.text) parts.push(node.text)
    if (node.content) {
      for (const child of node.content) walk(child)
    }
  }
  walk(content)
  return parts.join('\n')
}
