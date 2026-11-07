import type { MnCard } from '../types'

/**
 * 把当前选中的卡片按原有顺序置顶，其余卡片保持原有相对顺序。
 */
export function pinSelectedCards(cards: MnCard[], selectedIds: string[]): MnCard[] {
  if (selectedIds.length === 0) return cards
  const selected = new Set(selectedIds)
  const pinned: MnCard[] = []
  const rest: MnCard[] = []
  for (const card of cards) {
    if (selected.has(card.id)) pinned.push(card)
    else rest.push(card)
  }
  if (pinned.length === 0) return cards
  return [...pinned, ...rest]
}
