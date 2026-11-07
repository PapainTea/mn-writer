import type { WriterDocument } from '../types'
import { callNative, nativeBridgeAvailable } from '../mn/native'
import { normalizeContent } from './normalizeCard'
import { createSeedDocument, SEED_VERSION } from './seed'

export const STORAGE_KEYS = {
  documents: 'mn-writer:documents:v1',
  activeId: 'mn-writer:active:v1',
  theme: 'mn-writer:theme:v1',
  cardView: 'mn-writer:card-view:v1',
  panelSize: 'mn-writer:panel-size',
} as const

const ALL_KEYS = Object.values(STORAGE_KEYS)
const DOCS_KEY = STORAGE_KEYS.documents
const ACTIVE_KEY = STORAGE_KEYS.activeId
const THEME_KEY = STORAGE_KEYS.theme

export type ThemeMode = 'light' | 'dark' | 'system'

let cache: Map<string, string> | null = null
let bootstrapTask: Promise<void> | null = null

function readLocalValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocalValue(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // 浏览器缓存不可用时以内存与原生存储为准。
  }
}

function writeNativeValue(key: string, value: string | null): void {
  if (!nativeBridgeAvailable()) return
  void callNative('storage:save', { key, value }).catch(() => undefined)
}

/**
 * 读取 NSUserDefaults 中的文稿数据，并把浏览器缓存作为迁移来源。
 * React 渲染前调用一次，之后的读取都走同步内存缓存。
 */
export function bootstrapStorage(): Promise<void> {
  if (bootstrapTask) return bootstrapTask

  bootstrapTask = (async () => {
    const values = new Map<string, string>()
    if (nativeBridgeAvailable()) {
      try {
        const result = await callNative<{ values?: Record<string, string> }>(
          'storage:load',
          { keys: ALL_KEYS },
          4_000,
        )
        for (const [key, value] of Object.entries(result?.values ?? {})) {
          if (typeof value === 'string') values.set(key, value)
        }
      } catch {
        // 原生存储读取失败时按空文稿启动，避免覆盖已经保存的数据。
      }
    } else {
      for (const key of ALL_KEYS) {
        const value = readLocalValue(key)
        if (value !== null) values.set(key, value)
      }
    }
    cache = values
  })()

  return bootstrapTask
}

export function readStoredValue(key: string): string | null {
  return cache?.get(key) ?? null
}

export function writeStoredValue(key: string, value: string | null): boolean {
  if (cache) {
    if (value === null) cache.delete(key)
    else cache.set(key, value)
  }
  if (nativeBridgeAvailable()) writeNativeValue(key, value)
  else writeLocalValue(key, value)
  return true
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function loadDocuments(): WriterDocument[] {
  try {
    const raw = readStoredValue(DOCS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as WriterDocument[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seed = createSeedDocument()
        return parsed.map((doc) => {
          // 内置演示文稿的版本落后时替换为当前版本，用户自己的文稿保持原样。
          if (doc.id === seed.id && (doc.seedVersion ?? 0) < SEED_VERSION) return seed
          return { ...doc, content: normalizeContent(doc.content) }
        })
      }
    }
  } catch {
    // 损坏的本地数据回落到示例文稿，避免空白界面。
  }
  return [createSeedDocument()]
}

export function persistDocuments(documents: WriterDocument[]): boolean {
  try {
    return writeStoredValue(DOCS_KEY, JSON.stringify(documents))
  } catch {
    // 本地存储写满时保留当前内存状态，调用方负责提示导出备份。
    return false
  }
}

export function loadActiveId(documents: WriterDocument[]): string {
  const stored = readStoredValue(ACTIVE_KEY)
  if (stored && documents.some((doc) => doc.id === stored)) return stored
  return documents[0]?.id ?? ''
}

export function persistActiveId(id: string): void {
  writeStoredValue(ACTIVE_KEY, id)
}

export function loadTheme(): ThemeMode {
  const value = readStoredValue(THEME_KEY)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function persistTheme(theme: ThemeMode): void {
  writeStoredValue(THEME_KEY, theme)
}
