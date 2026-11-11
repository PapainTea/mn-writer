/**
 * 资料库动作。
 *
 * 检索结果里的卡片可以定位到 MarginNote，也可以插入正文；
 * 文献可以打开到 MarginNote 的对应文档。
 */

import { useCallback } from 'react'
import type { LibraryDocumentHit, LibraryNoteHit, MnAdapter, MnCard } from '../types'
import { useLibrarySearch } from './useLibrarySearch'

interface LibraryActionsOptions {
  adapter: MnAdapter
  insertCard: (card: MnCard) => void
  onToast: (message: string) => void
}

export function useLibraryActions({ adapter, insertCard, onToast }: LibraryActionsOptions) {
  const { search, ...library } = useLibrarySearch()

  const onSearchLibrary = useCallback(
    (query: string) => {
      void search(query)
    },
    [search],
  )

  const onFocusNote = useCallback(
    (note: LibraryNoteHit) => {
      adapter.focusCard(note.id)
    },
    [adapter],
  )

  const onInsertNote = useCallback(
    async (note: LibraryNoteHit) => {
      const cards = await adapter.getCards([note.id])
      const card = cards[0]
      if (!card) {
        onToast('无法读取该卡片')
        return
      }
      insertCard(card)
    },
    [adapter, insertCard, onToast],
  )

  const onOpenDocument = useCallback(
    async (document: LibraryDocumentHit) => {
      const ok = await adapter.locateDocument(document.id)
      if (!ok) onToast('无法打开该文献')
    },
    [adapter, onToast],
  )

  return { library, onSearchLibrary, onFocusNote, onInsertNote, onOpenDocument }
}
