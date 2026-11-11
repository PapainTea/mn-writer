/**
 * 卡片使用痕迹。
 *
 * 痕迹记录卡片最近一次进入正文的时间。
 * 很久以前用过、此刻又被检索到的卡片会被标为「旧证据」，
 * 提示作者重新捡起当初读过却已经忘记的材料。
 */

import type { WriterDocument } from '../types'

const DAY = 24 * 60 * 60 * 1000
/** 超过该天数没有使用的卡片标记为旧证据。 */
const STALE_DAYS = 7

export function cardUsageMap(document: WriterDocument | undefined): Map<string, number> {
  const map = new Map<string, number>()
  if (!document?.cardUsage) return map
  for (const [id, at] of Object.entries(document.cardUsage)) {
    if (typeof at === 'number' && Number.isFinite(at)) map.set(id, at)
  }
  return map
}

export function isStaleUsage(at: number | undefined, now = Date.now()): boolean {
  if (at === undefined) return false
  return now - at > STALE_DAYS * DAY
}

/** 旧证据的说明文字。 */
export function staleUsageLabel(at: number, now = Date.now()): string {
  const days = Math.floor((now - at) / DAY)
  if (days < 1) return '今天用过'
  if (days < STALE_DAYS) return `${days} 天前用过`
  if (days < 60) return `${days} 天前用过`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 个月前用过`
  return `${Math.floor(days / 365)} 年前用过`
}
