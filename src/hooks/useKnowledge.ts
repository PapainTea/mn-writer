/**
 * 跨文稿知识记录。
 *
 * 记录保存作者使用过的卡片，以及使用所在的文稿。
 * 每次卡片进入正文时写入一次。
 */

import { useCallback, useRef, useState } from 'react'
import { applyUsage, type KnowledgeStore } from '../lib/knowledge'
import { loadKnowledgeStore, persistKnowledgeStore } from '../lib/storage'

export function useKnowledge() {
  const [store, setStore] = useState<KnowledgeStore>(() => loadKnowledgeStore())
  const storeRef = useRef(store)

  const record = useCallback((cardId: string, docId: string, docTitle: string) => {
    const next = applyUsage(storeRef.current, cardId, docId, docTitle)
    storeRef.current = next
    setStore(next)
    persistKnowledgeStore(next)
  }, [])

  return { store, record }
}
