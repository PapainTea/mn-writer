/**
 * 证据的选取。
 *
 * 字面命中的卡片与概念扩展补问出来的卡片一起构成证据。
 * 字面命中优先，概念扩展补足，两者的数量上限相同对待。
 */

import type { RelevanceHit } from './relevance'

/** 字面命中的数量上限。 */
const DIRECT_LIMIT = 3
/** 概念扩展的数量上限。 */
const CONCEPT_LIMIT = 2

/**
 * 选出用于证据展示的卡片。
 *
 * 字面命中排在前面，概念扩展的卡片排在后面。
 */
export function pickEvidenceHits(hits: RelevanceHit[]): RelevanceHit[] {
  const direct = hits.filter((hit) => !hit.via).slice(0, DIRECT_LIMIT)
  const concepts = hits.filter((hit) => hit.via).slice(0, CONCEPT_LIMIT)
  return [...direct, ...concepts]
}
