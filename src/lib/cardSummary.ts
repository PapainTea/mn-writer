import type { MnCard } from '../types'

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
  title: string
  excerpt: string
  detail: string
  source: string
}

export function cardSummary(card: MnCard): CardSummary {
  const title = normalizeText(card.title) || '未命名卡片'
  const excerpt = normalizeText(card.excerpt)
  const documentTitle = normalizeText(card.documentTitle ?? '')
  const page = pageLabel(card)
  const distinctExcerpt = excerpt && excerpt !== title ? excerpt : ''
  const distinctSource = documentTitle && documentTitle !== title ? documentTitle : ''
  const detail = [CARD_KIND_LABEL[card.kind], distinctSource, page].filter(Boolean).join(' · ')
  const source = distinctSource ? [distinctSource, page].filter(Boolean).join(' · ') : page

  return {
    title,
    excerpt: distinctExcerpt,
    detail,
    source,
  }
}
