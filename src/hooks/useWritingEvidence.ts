/**
 * 写作证据。
 *
 * 相关面板、证据条与助手面板共用同一组命中结果。
 * 这里把相关度、证据的选取与资料库候选收在一起，界面层只读取结果。
 */

import type { Editor } from '@tiptap/core'
import { useMemo } from 'react'
import type { AssociationHit } from '../lib/associations'
import type { WritingContext } from '../lib/context'
import { pickEvidenceHits } from '../lib/evidencePick'
import type { RelevanceHit } from '../lib/relevance'
import type { MnCard } from '../types'
import { useLibrarySuggest, type LibrarySuggestState } from './useLibrarySuggest'
import { useWritingRelevance, type WritingRelevanceOptions } from './useWritingRelevance'

export interface WritingEvidence {
  /** 当前写作上下文。 */
  context: WritingContext | null
  /** 相关面板的命中结果。 */
  hits: RelevanceHit[]
  /** 联想结果。 */
  associations: AssociationHit[]
  /** 证据条与助手面板共用的命中结果。 */
  evidence: RelevanceHit[]
  /** 段落缺料时的资料库候选。 */
  suggest: LibrarySuggestState
}

export function useWritingEvidence(
  editor: Editor | null,
  cards: MnCard[],
  insertedIds: Set<string>,
  options: WritingRelevanceOptions = {},
): WritingEvidence {
  const { context, hits, associations } = useWritingRelevance(
    editor,
    cards,
    insertedIds,
    options,
  )
  const evidence = useMemo(() => pickEvidenceHits(hits), [hits])
  const suggest = useLibrarySuggest({ context, hits, cards })
  return { context, hits, associations, evidence, suggest }
}
