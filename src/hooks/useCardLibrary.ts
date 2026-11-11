/**
 * 学习集卡片。
 *
 * 面板挂载后读取一次学习集，
 * MarginNote 的学习集变化或窗口重新获得焦点时静默刷新。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MnAdapter, MnCard } from '../types'

export interface CardLibrary {
  /** 学习集里的全部卡片。 */
  cards: MnCard[]
  /** 是否正在读取卡片。 */
  loading: boolean
  /** 重新读取卡片。 */
  refresh: (options?: { silent?: boolean }) => Promise<void>
}

export function useCardLibrary(adapter: MnAdapter): CardLibrary {
  const [cards, setCards] = useState<MnCard[]>([])
  const [loading, setLoading] = useState(true)
  const sequence = useRef(0)

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const current = sequence.current + 1
      sequence.current = current
      if (!options?.silent) setLoading(true)
      try {
        const list = await adapter.listCards()
        if (sequence.current === current) setCards(list)
      } catch {
        if (sequence.current === current) setCards([])
      } finally {
        if (sequence.current === current) setLoading(false)
      }
    },
    [adapter],
  )

  useEffect(() => {
    // 挂载后读取一次学习集卡片，结果由 refresh 写回状态。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  useEffect(
    () =>
      adapter.subscribeChange(() => {
        void refresh({ silent: true })
      }),
    [adapter, refresh],
  )

  useEffect(() => {
    const onFocus = () => {
      void refresh({ silent: true })
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  return { cards, loading, refresh }
}
