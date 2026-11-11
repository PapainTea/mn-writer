/**
 * 论证覆盖。
 *
 * 覆盖统计每一节正文里的卡片数量，
 * 用来发现缺少材料支撑的章节。
 * 章节的边界与大纲一致：标题开始，到下一个同级或更高级标题之前结束。
 */

import type { Editor } from '@tiptap/core'

/**
 * 统计各节的卡片数量。
 *
 * 键与大纲条目的标识一致，值为该节正文里的卡片数量。
 */
export function collectCoverage(editor: Editor): Map<string, number> {
  const counts = new Map<string, number>()
  let current = ''
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const text = node.textContent.trim()
      if (!text) return true
      const level = Math.min(Math.max(Number(node.attrs.level) || 1, 1), 3)
      current = `${pos}-${level}`
      if (!counts.has(current)) counts.set(current, 0)
      return true
    }
    if (node.type.name === 'cardBlock' && current) {
      counts.set(current, (counts.get(current) ?? 0) + 1)
    }
    return true
  })
  return counts
}
