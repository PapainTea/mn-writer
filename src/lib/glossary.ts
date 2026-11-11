/**
 * 文稿术语提取。
 *
 * 术语来自手稿自身的用词统计：反复出现的词被视为术语，
 * 助手据此沿用手稿既有的写法，资料库检索据此找出相关材料。
 *
 * 中文按词切分，不用滑动的字串窗口。窗口会切出「规矩与信任如」这类
 * 跨词碎片，碎片进入术语表以后，助手会跟着学这些写法。
 * 写作台的界面用语不计入术语。
 */

import { conceptWords, isGeneric } from './conceptWords'
import { normalizeText } from './tokenize'

export interface GlossaryTerm {
  term: string
  count: number
}

/** 中文词至少出现两次。 */
const MIN_CJK_COUNT = 2
/** 英文词至少出现两次。 */
const MIN_LATIN_COUNT = 2
/** 英文词的最小长度。 */
const MIN_LATIN_LENGTH = 3
/** 只出现一次时，足够长的英文词也按术语收录。 */
const LONG_LATIN_LENGTH = 8
/** 提取的术语数量上限。 */
const TERM_LIMIT = 12

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

function isCjkTerm(term: string): boolean {
  return CJK.test(term)
}

/**
 * 去掉被更长词组覆盖的短词组。
 *
 * 「小样本研究」出现两次时，「样本研」不应单独入选。
 */
function dropCovered(terms: GlossaryTerm[]): GlossaryTerm[] {
  const sorted = [...terms].sort(
    (left, right) => right.term.length - left.term.length || right.count - left.count,
  )
  const kept: GlossaryTerm[] = []
  for (const term of sorted) {
    const covered = kept.some(
      (other) =>
        other.term.includes(term.term) &&
        other.count >= term.count,
    )
    if (!covered) kept.push(term)
  }
  return kept
}

/**
 * 提取文稿术语。
 *
 * 术语按出现次数与长度排序，次数相同时长的排在前面。
 */
export function extractGlossary(text: string, limit = TERM_LIMIT): GlossaryTerm[] {
  const normalized = normalizeText(text)
  if (!normalized) return []

  const counts = new Map<string, number>()
  for (const word of conceptWords(normalized)) {
    if (isGeneric(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }

  const cjkTerms: GlossaryTerm[] = []
  const latinTerms: GlossaryTerm[] = []
  for (const [term, count] of counts) {
    if (isCjkTerm(term)) {
      if (count < MIN_CJK_COUNT) continue
      cjkTerms.push({ term, count })
      continue
    }
    if (term.length < MIN_LATIN_LENGTH) continue
    if (count < MIN_LATIN_COUNT && term.length < LONG_LATIN_LENGTH) continue
    latinTerms.push({ term, count })
  }

  const all = [...dropCovered(cjkTerms), ...dropCovered(latinTerms)]
  all.sort(
    (left, right) =>
      right.count - left.count ||
      right.term.length - left.term.length ||
      left.term.localeCompare(right.term),
  )
  return all.slice(0, limit)
}

/** 术语清单的展示文字。 */
export function glossaryLabel(terms: GlossaryTerm[]): string {
  return terms.map((item) => item.term).join('、')
}

/** 检索词只取术语里最有代表性的一个。 */
export function pickGlossaryTerm(terms: GlossaryTerm[]): string | undefined {
  return terms[0]?.term
}
