import type { WriterDocument } from '../types'
import { callNative, nativeBridgeAvailable } from '../mn/native'
import { parseKnowledge, type KnowledgeStore } from './knowledge'
import { normalizeContent } from './normalizeCard'
import { createSeedDocument, SEED_VERSION } from './seed'

export const STORAGE_KEYS = {
  documents: 'mn-writer:documents:v1',
  activeId: 'mn-writer:active:v1',
  theme: 'mn-writer:theme:v1',
  cardView: 'mn-writer:card-view:v1',
  panelSize: 'mn-writer:panel-size',
  llmEndpoint: 'mn-writer:llm-endpoint:v1',
  llmModel: 'mn-writer:llm-model:v1',
  knowledge: 'mn-writer:knowledge:v1',
} as const

/** 写在 NSUserDefaults 里的轻量设置。 */
const PREFERENCE_KEYS = [
  STORAGE_KEYS.activeId,
  STORAGE_KEYS.theme,
  STORAGE_KEYS.cardView,
  STORAGE_KEYS.panelSize,
  STORAGE_KEYS.llmEndpoint,
  STORAGE_KEYS.llmModel,
]
const DOCS_KEY = STORAGE_KEYS.documents
const ACTIVE_KEY = STORAGE_KEYS.activeId
const THEME_KEY = STORAGE_KEYS.theme
const KNOWLEDGE_KEY = STORAGE_KEYS.knowledge

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
 * 读取文稿数据与设置。
 *
 * 文稿数据保存在应用文档目录下的文件里，设置留在 NSUserDefaults。
 * 没有原生桥接时，全部数据落在浏览器本地存储。
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
          { keys: PREFERENCE_KEYS },
          4_000,
        )
        for (const [key, value] of Object.entries(result?.values ?? {})) {
          if (typeof value === 'string') values.set(key, value)
        }
      } catch {
        // 设置读取失败时按默认值启动。
      }
      try {
        const result = await callNative<{ value?: string | null }>(
          'documents:load',
          undefined,
          8_000,
        )
        if (typeof result?.value === 'string') values.set(DOCS_KEY, result.value)
      } catch {
        // 文稿读取失败时按空文稿启动，避免覆盖已经保存的数据。
      }
      if (!values.has(DOCS_KEY)) {
        // 文件读取失败时沿用浏览器里的备份。
        const backup = readLocalValue(DOCS_KEY)
        if (backup !== null) values.set(DOCS_KEY, backup)
      }
      try {
        const result = await callNative<{ value?: string | null }>(
          'knowledge:load',
          undefined,
          4_000,
        )
        if (typeof result?.value === 'string') values.set(KNOWLEDGE_KEY, result.value)
      } catch {
        // 知识记录读取失败时按空记录启动。
      }
    } else {
      for (const key of [...PREFERENCE_KEYS, DOCS_KEY, KNOWLEDGE_KEY]) {
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
      if (Array.isArray(parsed)) {
        // 作者主动删光了文稿，此时保持空列表，不重新塞回内置演示文稿。
        if (parsed.length === 0) return []
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
  // 从未写过文稿数据，属于首次启动，给出内置演示文稿。
  return [createSeedDocument()]
}

export function persistDocuments(documents: WriterDocument[]): boolean {
  try {
    const value = JSON.stringify(documents)
    if (nativeBridgeAvailable()) {
      // 文稿写入应用文档目录下的文件，不占用 NSUserDefaults。
      void callNative('documents:save', { value }).catch(() => {
        // 文件写入失败时退到浏览器本地存储，避免丢失已写内容。
        writeLocalValue(DOCS_KEY, value)
      })
      return true
    }
    return writeStoredValue(DOCS_KEY, value)
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

/** 读取跨文稿的卡片使用记录。 */
export function loadKnowledgeStore(): KnowledgeStore {
  return parseKnowledge(readStoredValue(KNOWLEDGE_KEY))
}

/** 写入跨文稿的卡片使用记录。 */
export function persistKnowledgeStore(store: KnowledgeStore): boolean {
  const value = JSON.stringify(store)
  if (cache) cache.set(KNOWLEDGE_KEY, value)
  if (nativeBridgeAvailable()) {
    void callNative('knowledge:save', { value }).catch(() => {
      // 文件写入失败时退回浏览器本地存储，避免丢失记录。
      writeLocalValue(KNOWLEDGE_KEY, value)
    })
    return true
  }
  writeLocalValue(KNOWLEDGE_KEY, value)
  return true
}
