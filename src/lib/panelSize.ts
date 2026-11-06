import { readStoredValue, STORAGE_KEYS, writeStoredValue } from './storage'

export interface PanelSize {
  width: number
  height: number
}

export const PANEL_SIZE_LIMIT = {
  min: { width: 420, height: 420 },
  max: { width: 1680, height: 1200 },
}

const STORAGE_KEY = STORAGE_KEYS.panelSize

export function clampPanelSize(size: PanelSize): PanelSize {
  return {
    width: Math.min(
      Math.max(Math.round(size.width), PANEL_SIZE_LIMIT.min.width),
      PANEL_SIZE_LIMIT.max.width,
    ),
    height: Math.min(
      Math.max(Math.round(size.height), PANEL_SIZE_LIMIT.min.height),
      PANEL_SIZE_LIMIT.max.height,
    ),
  }
}

export function currentPanelSize(): PanelSize {
  return { width: window.innerWidth, height: window.innerHeight }
}

export function readStoredPanelSize(): PanelSize | null {
  try {
    const raw = readStoredValue(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PanelSize>
    if (typeof parsed.width !== 'number' || typeof parsed.height !== 'number') return null
    return clampPanelSize({ width: parsed.width, height: parsed.height })
  } catch {
    return null
  }
}

export function storePanelSize(size: PanelSize): void {
  writeStoredValue(STORAGE_KEY, JSON.stringify(clampPanelSize(size)))
}

export function applyPanelSize(size: PanelSize): boolean {
  const target = clampPanelSize(size)
  const bridge = window.mn
  if (!bridge || typeof bridge.size !== 'function') return false
  bridge.size(target.width, target.height)
  return true
}
