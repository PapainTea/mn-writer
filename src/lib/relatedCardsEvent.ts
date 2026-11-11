/**
 * 相关卡片事件。
 *
 * 正文卡片在菜单里发起请求，界面层收到后打开弹层。
 */

import type { MnCard } from '../types'

const RELATED_CARDS_EVENT = 'mn-writer:related-cards'

export function openRelatedCards(card: MnCard): void {
  window.dispatchEvent(new CustomEvent<MnCard>(RELATED_CARDS_EVENT, { detail: card }))
}

export function subscribeRelatedCards(handler: (card: MnCard) => void): () => void {
  const listener = (event: Event) => {
    const card = (event as CustomEvent<MnCard>).detail
    if (card) handler(card)
  }
  window.addEventListener(RELATED_CARDS_EVENT, listener)
  return () => window.removeEventListener(RELATED_CARDS_EVENT, listener)
}
