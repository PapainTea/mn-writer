import { readStoredValue, STORAGE_KEYS, writeStoredValue } from './storage'

export type CardViewMode = 'full' | 'compact'

const STORAGE_KEY = STORAGE_KEYS.cardView
const listeners = new Set<() => void>()

let mode: CardViewMode | null = null

function currentMode(): CardViewMode {
  if (mode === null) {
    mode = readStoredValue(STORAGE_KEY) === 'compact' ? 'compact' : 'full'
  }
  return mode
}

export function getCardViewMode(): CardViewMode {
  return currentMode()
}

export function setCardViewMode(next: CardViewMode): void {
  if (next === currentMode()) return
  mode = next
  writeStoredValue(STORAGE_KEY, next)
  for (const listener of listeners) listener()
}

export function subscribeCardView(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
