/**
 * 卡片定位。
 *
 * 在 MarginNote 的脑图里定位到指定卡片。演示模式没有 MarginNote 可定位，
 * 此时给出提示。
 */

import { useCallback } from 'react'
import type { MnAdapter, MnCard } from '../types'

export function useCardFocus(adapter: MnAdapter, onToast: (message: string) => void) {
  return useCallback(
    (card: MnCard) => {
      if (adapter.kind === 'mock') {
        onToast('演示数据无法定位')
        return
      }
      adapter.focusCard(card.id)
    },
    [adapter, onToast],
  )
}
