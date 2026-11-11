/**
 * 资料库候选。
 *
 * 段落里的关键内容学习集没有覆盖时，资料库里可能还有可用材料。
 * 这里检索一次，把学习集以外的材料交给作者判断。
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { getAdapter } from '../mn'
import type { WritingContext } from '../lib/context'
import { cardText, conceptWords } from '../lib/conceptWords'
import { longestConceptWord, pickGapQuery } from '../lib/gapQuery'
import type { RelevanceHit } from '../lib/relevance'
import type { LibraryDocumentHit, LibraryNoteHit, MnCard } from '../types'

export type LibrarySuggestStatus = 'idle' | 'loading' | 'done' | 'error'

export interface LibrarySuggestState {
  status: LibrarySuggestStatus
  query: string
  notes: LibraryNoteHit[]
  documents: LibraryDocumentHit[]
}

interface LibrarySuggestOptions {
  /** 当前写作上下文。 */
  context: WritingContext | null
  /** 相关面板命中的卡片。 */
  hits: RelevanceHit[]
  /** 学习集里的卡片。 */
  cards: MnCard[]
}

const INITIAL_STATE: LibrarySuggestState = {
  status: 'idle',
  query: '',
  notes: [],
  documents: [],
}

/** 候选条数上限。 */
const SUGGEST_LIMIT = 4
/** 段落停止输入以后再检索，避免每次击键都请求宿主。 */
const SUGGEST_DELAY = 420

/** 卡片文字里出现的概念词。 */
function wordsOf(cards: MnCard[]): Set<string> {
  const words = new Set<string>()
  for (const card of cards) {
    for (const word of conceptWords(cardText(card))) words.add(word)
  }
  return words
}

export function useLibrarySuggest({
  context,
  hits,
  cards,
}: LibrarySuggestOptions): LibrarySuggestState {
  const adapter = useMemo(() => getAdapter(), [])
  const [state, setState] = useState<LibrarySuggestState>(INITIAL_STATE)
  const sequence = useRef(0)
  const learningWords = useMemo(() => wordsOf(cards), [cards])
  const coveredWords = useMemo(() => wordsOf(hits.map((hit) => hit.card)), [hits])
  const learningIds = useMemo(() => new Set(cards.map((card) => card.id)), [cards])
  const paragraph = context?.paragraph ?? ''

  // 段落里最长的词是作者正在写的内容。命中卡片没有提到这个词，
  // 并且学习集里也没有这个词，说明材料缺失。
  const key = longestConceptWord(paragraph)
  const missing = key !== '' && !coveredWords.has(key) && !learningWords.has(key)
  const known = useMemo(
    () => new Set([...coveredWords, ...learningWords]),
    [coveredWords, learningWords],
  )
  const query = missing ? pickGapQuery(paragraph, known) : ''

  useEffect(() => {
    if (!query) return
    const current = sequence.current + 1
    sequence.current = current
    const timer = window.setTimeout(() => {
      void adapter
        .searchLibrary(query)
        .then((result) => {
          if (sequence.current !== current) return
          const notes = result.notes
            .filter((note) => !learningIds.has(note.id))
            .slice(0, SUGGEST_LIMIT)
          const documents = result.documents.slice(0, SUGGEST_LIMIT)
          setState({ status: 'done', query, notes, documents })
        })
        .catch(() => {
          if (sequence.current !== current) return
          setState({ status: 'error', query, notes: [], documents: [] })
        })
    }, SUGGEST_DELAY)
    return () => window.clearTimeout(timer)
  }, [adapter, learningIds, query])

  if (!query) return INITIAL_STATE
  // 检索词已经变化，说明上一次的结果不再对应当前段落。
  if (state.query !== query) {
    return { status: 'loading', query, notes: [], documents: [] }
  }
  return state
}
