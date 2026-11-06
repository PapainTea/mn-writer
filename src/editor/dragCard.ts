import type { MnCard } from '../types'

let draggedCard: MnCard | null = null

export function setDraggedCard(card: MnCard): void {
  draggedCard = card
}

export function takeDraggedCard(): MnCard | null {
  const card = draggedCard
  draggedCard = null
  return card
}
