/**
 * Zotero 引用键索引。
 *
 * 引用键由 Zotero 插件按条目给出，摘录卡没有条目键，
 * 需要靠文档标识（即 MarginNote 的文档 md5）回溯。
 * 索引直接向本机的 Zotero 插件读取，不依赖 Zotero Connector 面板是否打开。
 */

import { callNative, nativeBridgeAvailable } from './native'

const INDEX_TTL = 10 * 60 * 1000
const REQUEST_TIMEOUT = 5_000
const INDEX_ROUTE = '/zotero-connector/citekey-index'

interface IndexEntry {
  itemKey?: string
  citationKey?: string
  docId?: string
}

interface IndexResponse {
  entries?: IndexEntry[]
}

interface StoredIndex {
  at?: number
  values?: Record<string, string>
}

let inflight: Promise<Record<string, string>> | null = null

function toValues(entries: IndexEntry[]): Record<string, string> {
  const values: Record<string, string> = {}
  for (const entry of entries) {
    const citationKey = entry.citationKey?.trim()
    if (!citationKey) continue
    const itemKey = entry.itemKey?.trim()
    if (itemKey) values[itemKey] = citationKey
    const docId = entry.docId?.trim()
    if (docId) values[docId] = citationKey
  }
  return values
}

async function readStoredIndex(): Promise<StoredIndex | null> {
  try {
    const result = await callNative<{ index?: StoredIndex | null }>('citekey:index')
    return result?.index ?? null
  } catch {
    return null
  }
}

async function fetchIndex(previous: Record<string, string>): Promise<Record<string, string>> {
  try {
    const result = await callNative<{ endpoint?: { host?: string; port?: number } | null }>(
      'citekey:endpoint',
    )
    const endpoint = result?.endpoint
    if (!endpoint?.host || !endpoint.port) return previous
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
    try {
      const response = await fetch(
        `http://${endpoint.host}:${endpoint.port}${INDEX_ROUTE}`,
        { signal: controller.signal },
      )
      if (!response.ok) return previous
      const payload = (await response.json()) as IndexResponse
      const values = toValues(payload.entries ?? [])
      if (Object.keys(values).length === 0) return previous
      await callNative('citekey:save', { values, at: Date.now() })
      return values
    } finally {
      window.clearTimeout(timer)
    }
  } catch {
    return previous
  }
}

/**
 * 读取引用键索引。
 *
 * 索引以条目键与文档标识为键，值为引用键。抓取失败时退回上一次的结果。
 */
export async function loadCitekeyIndex(): Promise<Record<string, string>> {
  if (!nativeBridgeAvailable()) return {}
  const stored = await readStoredIndex()
  const values = stored?.values ?? {}
  const fresh = typeof stored?.at === 'number' && Date.now() - stored.at < INDEX_TTL
  if (fresh && Object.keys(values).length > 0) return values
  if (!inflight) {
    inflight = fetchIndex(values).finally(() => {
      inflight = null
    })
  }
  return inflight
}
