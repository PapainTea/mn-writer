/**
 * 写作相关度。
 *
 * 以当前写作上下文为查询，给出学习集里的相关卡片，
 */

import type { Editor } from '@tiptap/core'
import { useMemo } from 'react'
import { buildAssociationIndex, findAssociations, type AssociationHit } from '../lib/associations'
import type { CardFeedbackValue } from '../lib/cardFeedback'
import type { CitationIndex } from '../lib/citationIndex'
import {
  buildConceptIndex,
  findConceptBridges,
  MIN_DIRECT_HITS,
  searchConceptCards,
} from '../lib/conceptExpansion'
import type { WritingContext } from '../lib/context'
import { buildRelevanceIndex, searchRelevantCards, type RelevanceHit } from '../lib/relevance'
import type { MnCard } from '../types'
import { useWritingContext } from './useWritingContext'

export interface WritingRelevance {
  context: WritingContext | null
  hits: RelevanceHit[]
  associations: AssociationHit[]
}

export interface WritingRelevanceOptions {
  limit?: number
  /** 作者对检索结果的判断。 */
  feedback?: Map<string, CardFeedbackValue>
  /** 卡片在历次写作中的使用次数。 */
  usage?: Map<string, number>
  /** 正文里的引用与学习集卡片的对应关系。 */
  citationIndex?: CitationIndex
}

export function useWritingRelevance(
  editor: Editor | null,
  cards: MnCard[],
  insertedIds: Set<string>,
  options: WritingRelevanceOptions = {},
): WritingRelevance {
  const context = useWritingContext(editor)
  const limit = options.limit ?? 8
  const feedback = options.feedback
  const usage = options.usage
  const citationIndex = options.citationIndex
  const index = useMemo(() => buildRelevanceIndex(cards), [cards])
  const conceptIndex = useMemo(() => buildConceptIndex(cards), [cards])
  const catalog = useMemo(() => buildAssociationIndex(cards), [cards])

  const hits = useMemo(() => {
    if (!context) return []
    const text = context.paragraph || context.previous
    if (!text.trim()) return []
    // 当前段落里写下的引用，其来源卡片排在最前。
    const citedIds = new Set<string>()
    for (const entry of citationIndex?.entries ?? []) {
      if (entry.from < context.pos || entry.from >= context.end) continue
      for (const card of entry.cards) citedIds.add(card.id)
    }
    const direct = searchRelevantCards(
      index,
      { text, heading: context.heading, previous: context.previous },
      { excludeIds: insertedIds, limit, feedback, usage, citedIds },
    )
    // 字面命中不足时补问一次概念扩展，让措辞不同的材料也能浮现。
    if (direct.length >= MIN_DIRECT_HITS) return direct
    const bridges = findConceptBridges(conceptIndex, {
      text,
      heading: context.heading,
      previous: context.previous,
    })
    const excludeIds = new Set([...insertedIds, ...direct.map((hit) => hit.card.id)])
    const concepts = searchConceptCards(conceptIndex, bridges, { excludeIds, feedback, usage })
    return [...direct, ...concepts].slice(0, limit)
  }, [citationIndex, conceptIndex, context, feedback, index, insertedIds, limit, usage])

  const associations = useMemo(() => {
    if (!context) return []
    return findAssociations(catalog, hits, {
      excludeIds: insertedIds,
      feedback,
    })
  }, [catalog, context, feedback, hits, insertedIds])

  return { context, hits, associations }
}
