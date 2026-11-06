export const CARD_COLORS = [
  '#2f6f5e',
  '#3f6f9f',
  '#a8742a',
  '#a3515f',
  '#6b5a9e',
  '#5f7038',
  '#4f6672',
  '#8a5f43',
]

export function cardColorIndex(index?: number): number {
  if (typeof index !== 'number' || Number.isNaN(index)) return 0
  return Math.abs(index) % CARD_COLORS.length
}

export function cardColor(index?: number): string {
  return CARD_COLORS[cardColorIndex(index)] ?? '#2f6f5e'
}
