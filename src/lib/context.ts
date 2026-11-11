/**
 * 写作上下文。
 *
 * 上下文指光标所在的段落、该段落所属的标题，以及上一段的文字。
 * 相关度检索以此为查询，命中结果即是「当下浮现」的证据。
 */

import type { Editor } from '@tiptap/core'

export interface WritingContext {
  /** 当前段落文字。 */
  paragraph: string
  /** 所在标题文字，没有标题时为空。 */
  heading: string
  /** 标题层级，没有标题时为 0。 */
  headingLevel: number
  /** 上一段文字。 */
  previous: string
  /** 当前段落在文档中的起始位置。 */
  pos: number
  /** 当前段落的结束位置。 */
  end: number
}

const MAX_PARAGRAPH_LENGTH = 400

function clamp(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= MAX_PARAGRAPH_LENGTH) return trimmed
  return trimmed.slice(0, MAX_PARAGRAPH_LENGTH)
}

function findHeading(editor: Editor, pos: number): { text: string; level: number } {
  let text = ''
  let level = 0
  editor.state.doc.nodesBetween(0, pos, (node) => {
    if (node.type.name !== 'heading') return true
    const value = node.textContent.trim()
    if (!value) return true
    text = value
    level = Math.min(Math.max(Number(node.attrs.level) || 1, 1), 3)
    return true
  })
  return { text, level }
}

function findPreviousParagraph(editor: Editor, pos: number): string {
  let best = { end: -1, text: '' }
  editor.state.doc.nodesBetween(0, pos, (node, nodePos) => {
    if (node.type.name !== 'paragraph') return true
    const end = nodePos + node.nodeSize
    // 取结束位置最靠后的段落，也就是紧邻当前段落的那一段。
    if (end <= pos && end > best.end) {
      best = { end, text: node.textContent }
    }
    return true
  })
  return best.text
}

/**
 * 读取光标处的写作上下文。
 *
 * 光标落在卡片、表格等非文本块时返回空结果。
 */
export function readWritingContext(editor: Editor): WritingContext | null {
  const { $from } = editor.state.selection
  if ($from.depth < 1) return null
  const parent = $from.parent
  if (!parent.isTextblock) return null
  if (parent.type.name !== 'paragraph' && parent.type.name !== 'heading') return null

  const pos = $from.before($from.depth)
  const end = pos + parent.nodeSize
  const paragraph = clamp(parent.textContent)
  const isHeading = parent.type.name === 'heading'
  const heading = isHeading
    ? {
        text: paragraph,
        level: Math.min(Math.max(Number(parent.attrs.level) || 1, 1), 3),
      }
    : findHeading(editor, pos)

  return {
    paragraph,
    heading: heading.text,
    headingLevel: heading.level,
    previous: clamp(findPreviousParagraph(editor, pos)),
    pos,
    end,
  }
}

/** 上下文的可读摘要，用于面板顶部说明当前在写什么。 */
export function describeContext(context: WritingContext | null): string {
  if (!context) return '未选中正文'
  if (context.heading) return context.heading
  if (context.paragraph) return context.paragraph.slice(0, 40)
  return '空白段落'
}
