import type { MnCard } from '../types'

export function cardSearchText(card: MnCard): string {
  return [
    card.title,
    card.excerpt,
    ...card.comments.map((comment) => comment.text),
    card.documentTitle,
    ...card.tags,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()
}

export function matchCard(card: MnCard, query: string): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true
  return cardSearchText(card).includes(trimmed)
}

export function filterCards(cards: MnCard[], query: string | undefined): MnCard[] {
  if (!query) return cards
  return cards.filter((card) => matchCard(card, query))
}
