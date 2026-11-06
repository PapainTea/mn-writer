import type { Editor } from '@tiptap/core'
import { flashHeading } from '../editor/OutlineFlash'
import type { OutlineItem } from '../types'

export function collectOutline(editor: Editor): OutlineItem[] {
  const items: OutlineItem[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return
    const text = node.textContent.trim()
    if (!text) return
    const level = Math.min(Math.max(Number(node.attrs.level) || 1, 1), 3)
    items.push({ id: `${pos}-${level}`, level, text, pos })
  })
  return items
}

export function jumpToOutline(editor: Editor, item: OutlineItem): void {
  const node = editor.state.doc.nodeAt(item.pos)
  if (!node || node.type.name !== 'heading') return
  editor.chain().focus().setTextSelection(item.pos + 1).scrollIntoView().run()
  flashHeading(editor, item.pos, node.nodeSize)
}
