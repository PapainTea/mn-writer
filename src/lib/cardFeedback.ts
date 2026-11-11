/**
 * 证据反馈。
 *
 * 作者对检索结果作出判断。判断保存在当前文稿里，
 * 相关度检索读取判断结果并调整卡片得分。
 */

import type { WriterDocument } from '../types'

export type CardFeedbackValue = 1 | -1

/** 判定为有用的证据得到的加权系数。 */
const USEFUL_FACTOR = 1.45
/** 判定为无用的证据得到的降权系数。 */
const USELESS_FACTOR = 0.3

export function cardFeedbackMap(
  document: WriterDocument | undefined,
): Map<string, CardFeedbackValue> {
  const map = new Map<string, CardFeedbackValue>()
  if (!document?.cardFeedback) return map
  for (const [id, value] of Object.entries(document.cardFeedback)) {
    if (value === 1 || value === -1) map.set(id, value)
  }
  return map
}

/** 反馈对应的得分系数，没有反馈时系数为一。 */
export function feedbackFactor(value: CardFeedbackValue | undefined): number {
  if (value === 1) return USEFUL_FACTOR
  if (value === -1) return USELESS_FACTOR
  return 1
}

/** 再次点击同一个按钮时取消反馈。 */
export function nextFeedback(
  current: CardFeedbackValue | undefined,
  target: CardFeedbackValue,
): CardFeedbackValue | undefined {
  return current === target ? undefined : target
}
