/**
 * 写作编辑器。
 *
 * 编辑器实例随文稿一起重建。
 * ProseMirror 的撤销栈属于编辑器实例，跨文稿共用同一个实例，
 * 切换文稿后的撤销操作会回滚上一份文稿的编辑，并把那份内容写进当前文稿。
 */

import type { Editor, Extensions, JSONContent } from '@tiptap/core'
import { useEditor } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import { takeDraggedCard } from '../editor/dragCard'
import { insertCardBlock } from '../editor/insertCard'
import { countInsertedCards } from '../lib/inserted'
import type { MnCard } from '../types'

interface WriterEditorOptions {
  extensions: Extensions
  content: JSONContent
  /** 文稿标识，文稿切换时重建编辑器。 */
  documentId: string
  /** 是否可编辑。没有文稿时正文不接受输入。 */
  editable: boolean
  /** 卡片被拖入正文。 */
  onDropCard: (card: MnCard, count: number) => void
  /** 正文发生变化。 */
  onUpdate: (editor: Editor) => void
}

export function useWriterEditor({
  extensions,
  content,
  documentId,
  editable,
  onDropCard,
  onUpdate,
}: WriterEditorOptions) {
  const dropRef = useRef(onDropCard)
  const updateRef = useRef(onUpdate)
  const editorRef = useRef<Editor | null>(null)

  useEffect(() => {
    dropRef.current = onDropCard
  }, [onDropCard])
  useEffect(() => {
    updateRef.current = onUpdate
  }, [onUpdate])

  const editor = useEditor(
    {
      extensions,
      content,
      editorProps: {
        attributes: {
          class: 'mn-editor',
          spellcheck: 'true',
        },
        handleDrop: (view, event) => {
          const card = takeDraggedCard()
          if (!card) return false
          const current = editorRef.current
          if (!current) return false
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
          const position = coords?.pos ?? view.state.doc.content.size
          if (!insertCardBlock(current, card, position)) return false
          const count = countInsertedCards(current.getJSON()).get(card.id) ?? 1
          dropRef.current(card, count)
          event.preventDefault()
          return true
        },
      },
      shouldRerenderOnTransaction: false,
      onUpdate: ({ editor: current }) => updateRef.current(current),
    },
    [extensions, documentId],
  )

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  return editor
}
