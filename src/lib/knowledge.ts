/**
 * 跨文稿知识记录。
 *
 * 记录保存作者使用过的卡片，以及使用所在的文稿。
 * 记录随作者积累，独立于单份文稿保存在本机。
 */

import { isStaleUsage, staleUsageLabel } from './cardUsage'

export interface KnowledgeDoc {
  /** 文稿标识。 */
  id: string
  /** 文稿标题。 */
  title: string
  /** 最近一次使用的时间。 */
  at: number
}

export interface KnowledgeRecord {
  /** 累计使用次数。 */
  count: number
  /** 最近一次使用的时间。 */
  lastAt: number
  /** 最近使用的文稿，按时间从新到旧排列。 */
  docs: KnowledgeDoc[]
}

export type KnowledgeStore = Record<string, KnowledgeRecord>

/** 每张卡片保留的文稿记录数量。 */
const MAX_DOCS = 3
/** 使用次数带来的加权上限。 */
const MAX_USAGE_FACTOR = 1.6
/** 每次使用带来的加权步长。 */
const USAGE_STEP = 0.12

export function parseKnowledge(raw: string | null): KnowledgeStore {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as KnowledgeStore
    if (!parsed || typeof parsed !== 'object') return {}
    const store: KnowledgeStore = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue
      const count = Number(value.count)
      const lastAt = Number(value.lastAt)
      if (!Number.isFinite(count) || !Number.isFinite(lastAt)) continue
      const docs = Array.isArray(value.docs)
        ? value.docs
            .filter((item): item is KnowledgeDoc => Boolean(item) && typeof item.id === 'string')
            .map((item) => ({
              id: item.id,
              title: typeof item.title === 'string' ? item.title : '',
              at: Number(item.at) || lastAt,
            }))
            .slice(0, MAX_DOCS)
        : []
      store[id] = { count, lastAt, docs }
    }
    return store
  } catch {
    return {}
  }
}

/** 记录一次卡片使用。 */
export function applyUsage(
  store: KnowledgeStore,
  cardId: string,
  docId: string,
  docTitle: string,
  at = Date.now(),
): KnowledgeStore {
  if (!cardId) return store
  const current = store[cardId]
  const others = current ? current.docs.filter((item) => item.id !== docId) : []
  return {
    ...store,
    [cardId]: {
      count: (current?.count ?? 0) + 1,
      lastAt: at,
      docs: [{ id: docId, title: docTitle, at }, ...others].slice(0, MAX_DOCS),
    },
  }
}

/** 使用次数表，供相关度打分使用。 */
export function knowledgeCountMap(store: KnowledgeStore): Map<string, number> {
  const map = new Map<string, number>()
  for (const [id, record] of Object.entries(store)) {
    map.set(id, record.count)
  }
  return map
}

/** 使用次数带来的加权系数。 */
export function usageFactor(count: number | undefined): number {
  if (!count || count <= 0) return 1
  return Math.min(1 + count * USAGE_STEP, MAX_USAGE_FACTOR)
}

export interface UsageHint {
  /** 痕迹文字。 */
  text: string
  /** 很久没有使用，属于旧证据。 */
  stale: boolean
}

function recordHint(
  record: KnowledgeRecord | undefined,
  currentDocId: string,
  now: number,
): UsageHint | undefined {
  if (!record) return undefined
  const label = staleUsageLabel(record.lastAt, now)
  const lastDoc = record.docs[0]
  if (lastDoc && lastDoc.id !== currentDocId && lastDoc.title) {
    return { text: `《${lastDoc.title}》${label}`, stale: isStaleUsage(record.lastAt, now) }
  }
  return { text: label, stale: isStaleUsage(record.lastAt, now) }
}

/**
 * 读取使用痕迹。
 *
 * 当前文稿里的痕迹更新时优先显示，否则显示最近一次使用的文稿。
 */
export function resolveUsageHint(
  cardId: string,
  knowledge: KnowledgeStore,
  docUsage: Map<string, number>,
  currentDocId: string,
  now = Date.now(),
): UsageHint | undefined {
  const at = docUsage.get(cardId)
  const record = knowledge[cardId]
  if (at !== undefined && (!record || at >= record.lastAt)) {
    return { text: staleUsageLabel(at, now), stale: isStaleUsage(at, now) }
  }
  return recordHint(record, currentDocId, now)
}
