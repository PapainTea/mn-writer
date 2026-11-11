/**
 * 卡片插入。
 *
 * 插入位置在当前段落、列表或标题之后。
 * 插入完成以后记录使用痕迹，并同步大纲与覆盖统计。
 */

import { useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { insertCardBlock } from '../editor/insertCard'
import { countInsertedCards } from '../lib/inserted'
import { cardLabel } from '../lib/cardSummary'
import type { MnCard } from '../types'

interface CardInsertionOptions {
  editor: Editor | null
  onToast: (message: string) => void
  onRecordUse: (cardId: string) => void
  onSync: (editor: Editor) => void
  onInserted: () => void
}

export function useCardInsertion({
  editor,
  onToast,
  onRecordUse,
  onSync,
  onInserted,
}: CardInsertionOptions) {
  return useCallback(
    (card: MnCard) => {
      if (!editor) return
      const { selection } = editor.state
      const cursor = selection.empty ? selection.$from : selection.$to
      const position =
        selection instanceof NodeSelection
          ? selection.to
          : cursor.depth > 0
            ? cursor.after(1)
            : selection.to
      if (!insertCardBlock(editor, card, position)) {
        onToast('插入失败，请重试')
        return
      }
      const count = countInsertedCards(editor.getJSON()).get(card.id) ?? 1
      onRecordUse(card.id)
      onSync(editor)
      const label = cardLabel(card)
      onToast(
        count > 1 ? `已插入「${label}」，正文共有 ${count} 处引用` : `已插入「${label}」`,
      )
      onInserted()
    },
    [editor, onInserted, onRecordUse, onSync, onToast],
  )
}
