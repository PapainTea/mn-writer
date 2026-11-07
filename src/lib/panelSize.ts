import { callNative, nativeBridgeAvailable } from '../mn/native'
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

/** 三档预设按当前可用区域的比例计算，避免大屏上过小、小屏上越界。 */
const PRESET_RATIOS = [0.62, 0.82, 1] as const

interface SafeSize {
  maxWidth: number
  maxHeight: number
}

let safeSize: SafeSize | null = null
let storeTimer: number | null = null

/**
 * 读取原生侧给出的安全区域。面板连同顶部拖拽条都要避开场景顶栏，
 * 因此高度上限不能只按页面的固定值计算。
 */
export async function refreshPanelSafeSize(): Promise<void> {
  if (!nativeBridgeAvailable()) return
  try {
    const result = await callNative<Partial<SafeSize>>('layout:metrics', undefined, 1_500)
    if (
      typeof result?.maxWidth === 'number' &&
      typeof result?.maxHeight === 'number' &&
      result.maxWidth > 0 &&
      result.maxHeight > 0
    ) {
      safeSize = { maxWidth: result.maxWidth, maxHeight: result.maxHeight }
    }
  } catch {
    // 面板尚未完成布局时沿用固定上限。
  }
}

function sizeLimit(): { width: number; height: number } {
  return {
    width: Math.min(PANEL_SIZE_LIMIT.max.width, safeSize?.maxWidth ?? PANEL_SIZE_LIMIT.max.width),
    height: Math.min(
      PANEL_SIZE_LIMIT.max.height,
      safeSize?.maxHeight ?? PANEL_SIZE_LIMIT.max.height,
    ),
  }
}

/**
 * 当前所处的预设序号。面板尺寸可能被 MarginNote 按可用空间修正，
 * 与预设值不再一致，因此单独记录序号，保证短按始终按顺序循环。
 */
let presetIndex = -1

function presetList(): PanelSize[] {
  const limit = sizeLimit()
  return PRESET_RATIOS.map((ratio) =>
    clampPanelSize({
      width: Math.round(limit.width * ratio),
      height: Math.round(limit.height * ratio),
    }),
  )
}

export function nextPanelSize(): PanelSize {
  const presets = presetList()
  presetIndex = (presetIndex + 1) % presets.length
  return presets[presetIndex] as PanelSize
}

/** 自由拖动后不再属于任何预设，下一次短按从首个预设开始。 */
export function markCustomPanelSize(): void {
  presetIndex = -1
}

export function clampPanelSize(size: PanelSize): PanelSize {
  const limit = sizeLimit()
  return {
    width: Math.min(
      Math.max(Math.round(size.width), PANEL_SIZE_LIMIT.min.width),
      limit.width,
    ),
    height: Math.min(
      Math.max(Math.round(size.height), PANEL_SIZE_LIMIT.min.height),
      limit.height,
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
  applyNativeLayout()
  window.setTimeout(applyNativeLayout, 180)
  scheduleStoreActualSize()
  return true
}

/** 宿主完成尺寸过渡后立即校正位置，避免面板短暂压住顶栏。 */
function applyNativeLayout(): void {
  if (!nativeBridgeAvailable()) return
  void callNative('layout:apply', undefined, 800).catch(() => undefined)
}

/**
 * 宿主可能按可用空间修正尺寸，落盘时记录修正后的实际值，
 * 避免下次启动再请求一次越界尺寸。
 */
function scheduleStoreActualSize(): void {
  if (storeTimer !== null) window.clearTimeout(storeTimer)
  storeTimer = window.setTimeout(() => {
    storeTimer = null
    storePanelSize(currentPanelSize())
  }, 480)
}
