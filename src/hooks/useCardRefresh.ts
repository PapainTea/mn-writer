/**
 * 正文卡片刷新。
 *
 * 刷新把正文里全部卡片的内容换成 MarginNote 里的最新内容，
 * 同一张卡片出现多次时各处一起更新。
 */

import type { Editor } from '@tiptap/core'
import { useCallback, useState } from 'react'
import type { MnAdapter } from '../types'

interface CardRefreshOptions {
  editor: Editor | null
  adapter: MnAdapter
  documentId: string
  onRefreshed: (options?: { silent?: boolean }) => Promise<void>
  onToast: (message: string) => void
  syncDerivedState: (editor: Editor) => void
}

export function useCardRefresh({
  editor,
  adapter,
  documentId,
  onRefreshed,
  onToast,
  syncDerivedState,
}: CardRefreshOptions) {
  const [refreshing, setRefreshing] = useState(false)

  const refreshAllCards = useCallback(async () => {
    if (!editor || refreshing) return

    const positions: { pos: number; cardId: string }[] = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'cardBlock') return
      const cardId =
        typeof node.attrs.cardId === 'string' && node.attrs.cardId
          ? node.attrs.cardId
          : ((node.attrs.snapshot as { id?: string } | null)?.id ?? '')
      if (cardId) positions.push({ pos, cardId })
    })
    if (positions.length === 0) {
      onToast('正文没有插入卡片')
      return
    }

    const currentDocumentId = documentId
    setRefreshing(true)
    try {
      const ids = [...new Set(positions.map((item) => item.cardId))]
      const cards = await adapter.getCards(ids)
      const byId = new Map(cards.map((card) => [card.id, card]))
      const failed = ids.filter((id) => !byId.has(id))

      if (documentId !== currentDocumentId) return

      const tr = editor.state.tr
      // 位置倒序更新，避免前面的替换影响后面的偏移量。
      for (const item of [...positions].reverse()) {
        const card = byId.get(item.cardId)
        if (!card) continue
        const node = editor.state.doc.nodeAt(item.pos)
        if (!node || node.type.name !== 'cardBlock') continue
        tr.setNodeMarkup(item.pos, undefined, {
          ...node.attrs,
          cardId: card.id,
          snapshot: card,
        })
      }
      if (tr.steps.length > 0) editor.view.dispatch(tr)

      syncDerivedState(editor)
      void onRefreshed({ silent: true })

      if (failed.length === 0) {
        onToast('已刷新所有卡片内容')
      } else if (cards.length === 0) {
        onToast('刷新失败，请稍后重试')
      } else {
        onToast(`已刷新 ${cards.length} 张卡片，${failed.length} 张刷新失败`)
      }
    } catch {
      onToast('刷新失败，请稍后重试')
    } finally {
      setRefreshing(false)
    }
  }, [adapter, documentId, editor, onRefreshed, onToast, refreshing, syncDerivedState])

  return { refreshing, refreshAllCards }
}
