import type { MnCard } from '../types'

/**
 * 把当前选中的卡片置顶，其余卡片保持原有相对顺序。
 */
export function pinSelectedCard(cards: MnCard[], selectedId: string | null): MnCard[] {
  if (!selectedId) return cards
  const index = cards.findIndex((card) => card.id === selectedId)
  if (index <= 0) return cards
  const pinned = cards[index]
  if (!pinned) return cards
  return [pinned, ...cards.slice(0, index), ...cards.slice(index + 1)]
}
