/**
 * 资料库检索词。
 *
 * 检索词优先取证据片段里的完整词组，这类词在资料库里确实存在；
 * 没有命中时取文稿术语，再退回标题与段落开头。
 */

import type { WritingContext } from './context'
import type { GlossaryTerm } from './glossary'
import { pickGlossaryTerm } from './glossary'
import type { RelevanceHit } from './relevance'
import { mergeTermSpans } from './tokenize'

/** 检索词的最小长度。 */
const MIN_QUERY_LENGTH = 2
/** 段落开头最多取用的字数。 */
const PARAGRAPH_PREFIX = 12
/** 段首需要去掉的标点。 */
const LEADING_MARKS = /^[\s「『"'([]+/

function phraseFromHit(hit: RelevanceHit): string | undefined {
  const spans = mergeTermSpans(hit.terms, hit.passage)
  if (spans.length === 0) return undefined
  const best = spans.slice().sort((left, right) => right.length - left.length)[0]
  return best && best.length >= MIN_QUERY_LENGTH ? best : undefined
}

export function pickSearchQuery(
  hits: RelevanceHit[],
  context: WritingContext | null,
  glossary: GlossaryTerm[],
): string {
  for (const hit of hits.slice(0, 3)) {
    const phrase = phraseFromHit(hit)
    if (phrase) return phrase
  }
  const term = pickGlossaryTerm(glossary)
  if (term) return term
  if (context?.heading) return context.heading
  const head = (context?.paragraph ?? '').replace(LEADING_MARKS, '').slice(0, PARAGRAPH_PREFIX)
  return head.trim()
}
