import type { MnCard } from '../types'
import { compareTextKey } from './htmlText'

export const CARD_KIND_LABEL: Record<MnCard['kind'], string> = {
  excerpt: '摘录卡',
  literature: '文献卡',
  note: '笔记卡',
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function pageLabel(card: MnCard): string {
  return card.page ? `p.${card.page}` : ''
}

export interface CardSummary {
  /** 卡片标题。卡片没有标题时为空串。 */
  title: string
  /** 卡片没有标题。 */
  untitled: boolean
  /** 卡片正文。卡片正文与标题文字相同时为空串。 */
  body: string
  /** 单行清单里的标识。卡片有标题时是标题，没有标题时是文献名。 */
  identifier: string
  /** 文献名。卡片没有标题时用作标题位。 */
  documentTitle: string
  /** 来源说明：文献名与页码。 */
  source: string
  /** 次要说明：来源。卡片类型只在正文展开的卡片上显示。 */
  detail: string
}

/**
 * 卡片的展示信息。
 *
 * 标题以 MarginNote 的数据为准。卡片没有标题时标题为空串，
 * 预览与正文首段都不充当标题。
 */
export function cardSummary(card: MnCard): CardSummary {
  const title = normalizeText(card.title)
  const documentTitle = normalizeText(card.documentTitle ?? '')
  const page = pageLabel(card)
  const kindLabel = CARD_KIND_LABEL[card.kind]
  const excerpt = normalizeText(card.excerpt)
  const preview = normalizeText(card.preview ?? '')
  const body =
    excerpt && excerpt !== title ? excerpt : preview && preview !== title ? preview : ''
  const source =
    documentTitle && documentTitle !== title
      ? [documentTitle, page].filter(Boolean).join(' · ')
      : page
  const untitled = title.length === 0
  return {
    title,
    untitled,
    body,
    identifier: title || documentTitle || kindLabel,
    documentTitle,
    source,
    detail: source,
  }
}

/**
 * 提示语里的卡片名称。
 *
 * 卡片没有标题时用文献名，文献名也没有时用卡片类型。
 */
export function cardLabel(card: MnCard): string {
  return cardSummary(card).identifier
}

/**
 * 两段文字是否相同。
 *
 * 比较时忽略空白与标点，用于避免标题与正文重复出现。
 */
export function sameText(left: string, right: string): boolean {
  if (!left.trim() || !right.trim()) return false
  return compareTextKey(left) === compareTextKey(right)
}
