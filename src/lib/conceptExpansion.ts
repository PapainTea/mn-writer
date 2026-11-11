/**
 * 概念扩展。
 *
 * 作者写下的词未必是资料里使用的词。检索先按字面命中，
 * 再从学习集里找出与查询词共同出现、区分度高的词，
 * 用这些词补问一次，让相近材料在关键词不同时也能浮现。
 *
 * 中文按词切分，不按二元组切分。二元组会产生「作行」这类
 * 跨词碎片，扩展结果因此难以解释。
 */

import type { MnCard } from '../types'
import type { RelevanceHit, RelevanceOptions, RelevanceQuery } from './relevance'
import { cardText, conceptWords, countWords, isGeneric, tagText } from './conceptWords'

/** 参与扩展的查询词最低逆文档频率。 */
const MIN_QUERY_IDF = 1
/** 扩展词的最低逆文档频率。 */
const MIN_EXPANSION_IDF = 1.2
/** 小学习集放宽后的查询词逆文档频率下限。 */
const MIN_QUERY_IDF_SMALL = 0.4
/** 小学习集放宽后的扩展词逆文档频率下限。 */
const MIN_EXPANSION_IDF_SMALL = 0.8
/** 扩展词允许出现的卡片数量占学习集规模的比例。 */
const EXPANSION_DF_RATIO = 0.12
/** 扩展词允许出现的最少卡片数量。 */
const EXPANSION_DF_FLOOR = 4
/** 学习集达到该数量时，扩展词需要在多张卡片里出现。 */
const SUPPORT_CARDS = 20
/** 扩展词至少出现在这么多张卡片里。 */
const MIN_SUPPORT = 2
/** 扩展词候选数量上限。 */
const MAX_CANDIDATES = 24
/** 概念扩展结果数量上限。 */
const MAX_RESULTS = 3
/** 概念扩展结果的最低得分。 */
const MIN_SCORE = 2.6
/** 标题与标签里的词在计分时的权重。 */
const PROMINENT_WEIGHT = 1.3
/** 只出现在批注里的词在计分时的权重。 */
const COMMENT_WEIGHT = 0.5
/** 字面命中少于该数量时才补充概念扩展。 */
export const MIN_DIRECT_HITS = 3

interface ConceptProfile {
  card: MnCard
  words: Map<string, number>
  /** 标题与标签里的词，这类词在卡片里承担主题标记的作用。 */
  prominent: Set<string>
  /** 摘录与文献名里的词，这类词说明卡片讲述的内容。 */
  body: Set<string>
}

export interface ConceptIndex {
  profiles: Map<string, ConceptProfile>
  idf: Map<string, number>
  /** 每个词出现在多少张卡片里。 */
  frequency: Map<string, number>
  /** 在标题或标签里出现过的词。 */
  prominent: Set<string>
  docCount: number
}

/** 为一批卡片建立词级概念索引。 */
export function buildConceptIndex(cards: MnCard[]): ConceptIndex {
  const profiles = new Map<string, ConceptProfile>()
  const documentFrequency = new Map<string, number>()
  const prominent = new Set<string>()
  for (const card of cards) {
    const words = countWords(cardText(card))
    const marked = new Set<string>([
      ...conceptWords(card.title),
      ...conceptWords(tagText(card.tags)),
    ])
    const body = new Set<string>([
      ...conceptWords(card.excerpt),
      ...conceptWords(card.documentTitle ?? ''),
    ])
    profiles.set(card.id, { card, words, prominent: marked, body })
    for (const word of words.keys()) {
      documentFrequency.set(word, (documentFrequency.get(word) ?? 0) + 1)
    }
    for (const word of marked) prominent.add(word)
  }
  const docCount = Math.max(cards.length, 1)
  const idf = new Map<string, number>()
  for (const [word, frequency] of documentFrequency) {
    idf.set(word, Math.log(1 + docCount / (1 + frequency)))
  }
  return { profiles, idf, frequency: documentFrequency, prominent, docCount }
}

export interface ConceptBridge {
  /** 扩展词。 */
  term: string
  /** 查询里与扩展词共同出现的词。 */
  bridge: string
  /** 扩展词在共同出现的卡片里的数量。 */
  support: number
}

interface BridgeScore {
  term: string
  bridge: string
  bridgeIdf: number
  support: number
  weight: number
  cards: Set<string>
}

function queryWords(query: RelevanceQuery): Set<string> {
  const words = new Set<string>()
  // 只取当前段落。标题与上一段常含界面用语，容易带偏扩展方向。
  for (const word of conceptWords(query.text)) words.add(word)
  return words
}

/**
 * 找出与查询词共同出现的扩展词。
 *
 * 扩展词按权重降序排列，权重同时考虑查询词的区分度、
 * 扩展词的区分度与共同出现的卡片数量。
 */
export function findConceptBridges(
  index: ConceptIndex,
  query: RelevanceQuery,
): ConceptBridge[] {
  const words = queryWords(query)
  // 标题与残句的线索太少，扩展结果容易跑偏。
  if (words.size < 4) return []
  const large = index.docCount >= 40
  const minQueryIdf = large ? MIN_QUERY_IDF : MIN_QUERY_IDF_SMALL
  const minExpansionIdf = large ? MIN_EXPANSION_IDF : MIN_EXPANSION_IDF_SMALL
  // 出现在太多卡片里的词不构成关联，只说明卡片属于同一门学科。
  const maxExpansionFrequency = Math.max(
    EXPANSION_DF_FLOOR,
    Math.ceil(index.docCount * EXPANSION_DF_RATIO),
  )
  const scored = new Map<string, BridgeScore>()
  for (const [bridge, bridgeIdf] of index.idf) {
    if (!words.has(bridge) || bridgeIdf < minQueryIdf) continue
    // 桥接词要在学习集里找得到：出现在多张卡片里，或者出现在标题与标签里。
    // 只作为词的片段出现的字不做桥接，避免「差异」与「差异化」互相误认。
    const bridgeFrequency = index.frequency.get(bridge) ?? 0
    if (bridgeFrequency < 2 && !index.prominent.has(bridge)) continue
    for (const profile of index.profiles.values()) {
      if (!profile.words.has(bridge)) continue
      for (const [other, count] of profile.words) {
        if (words.has(other)) continue
        if (isGeneric(other)) continue
        const otherIdf = index.idf.get(other) ?? 0
        if (otherIdf < minExpansionIdf) continue
        const frequency = index.frequency.get(other) ?? 0
        if (frequency > maxExpansionFrequency) continue
        const current = scored.get(other) ?? {
          term: other,
          bridge,
          bridgeIdf,
          support: 0,
          weight: 0,
          cards: new Set<string>(),
        }
        if (!current.cards.has(profile.card.id)) {
          current.cards.add(profile.card.id)
          current.support += 1
        }
        current.weight += bridgeIdf * otherIdf * Math.min(count, 2)
        if (bridgeIdf > current.bridgeIdf) {
          current.bridge = bridge
          current.bridgeIdf = bridgeIdf
        }
        scored.set(other, current)
      }
    }
  }
  // 小学习集里词与词共现一次是常态，要求多次共现会检索不到任何结果。
  const minSupport = index.docCount >= SUPPORT_CARDS ? MIN_SUPPORT : 1
  return [...scored.values()]
    .filter((item) => item.support >= minSupport)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, MAX_CANDIDATES)
    .map(({ term, bridge, support }) => ({ term, bridge, support }))
}

/** 取命中词所在的句子，作为可核对的原文片段。 */
function findPassage(card: MnCard, terms: string[]): string {
  const sources = [card.excerpt, ...card.comments.map((comment) => comment.text)].filter(
    (value): value is string => Boolean(value && value.trim()),
  )
  for (const source of sources) {
    const text = source.replace(/\s+/g, ' ').trim()
    for (const term of terms) {
      const at = text.indexOf(term)
      if (at < 0) continue
      let start = 0
      for (let index = at - 1; index >= 0 && at - index < 80; index -= 1) {
        if (/[。！？；.!?;]/.test(text[index] ?? '')) {
          start = index + 1
          break
        }
      }
      let end = text.length
      for (let index = at; index < text.length && index - at < 80; index += 1) {
        if (/[。！？；.!?;]/.test(text[index] ?? '')) {
          end = index + 1
          break
        }
      }
      const slice = text.slice(start, end).trim()
      return slice.length > 90 ? `${slice.slice(0, 90)}…` : slice
    }
  }
  const fallback = sources[0]?.replace(/\s+/g, ' ').trim() ?? card.title
  return fallback.length > 90 ? `${fallback.slice(0, 90)}…` : fallback
}

/**
 * 按扩展词再检索一次，返回与字面命中不重复的卡片。
 *
 * 返回的卡片带有 `via`，界面据此说明关联路径。
 */
export function searchConceptCards(
  index: ConceptIndex,
  bridges: ConceptBridge[],
  options: RelevanceOptions = {},
): RelevanceHit[] {
  if (bridges.length === 0) return []
  const totalIdf = bridges.reduce((sum, item) => sum + (index.idf.get(item.term) ?? 0), 0)
  if (totalIdf <= 0) return []
  const results: RelevanceHit[] = []
  for (const profile of index.profiles.values()) {
    if (options.excludeIds?.has(profile.card.id)) continue
    let score = 0
    let matchedIdf = 0
    const matched: { term: string; bridge: string; idf: number }[] = []
    for (const bridge of bridges) {
      const count = profile.words.get(bridge.term)
      if (!count) continue
      const idf = index.idf.get(bridge.term) ?? 0
      // 标题与标签里的词承担主题标记的作用，摘录里的词说明卡片讲述的内容，
      // 只出现在批注里的词多半是作者的流程说明，关联作用较弱。
      const weight = profile.prominent.has(bridge.term)
        ? PROMINENT_WEIGHT
        : profile.body.has(bridge.term)
          ? 1
          : COMMENT_WEIGHT
      score += idf * Math.min(count, 2) * 1.6 * weight
      matchedIdf += idf
      matched.push({ term: bridge.term, bridge: bridge.bridge, idf })
    }
    if (matched.length === 0 || score < MIN_SCORE) continue
    // 关联路径优先展示卡片的主题词。主题词是卡片与其它卡片共有的概念，
    // 作者能据此判断两张卡片为何相关。
    matched.sort((left, right) => {
      const leftMarked = profile.prominent.has(left.term) ? 1 : 0
      const rightMarked = profile.prominent.has(right.term) ? 1 : 0
      if (leftMarked !== rightMarked) return rightMarked - leftMarked
      return right.idf - left.idf
    })
    const best = matched[0]
    if (!best) continue
    results.push({
      card: profile.card,
      score,
      coverage: Math.min(matchedIdf / totalIdf, 1),
      fields: [],
      terms: matched.map((item) => item.term).slice(0, 8),
      passage: findPassage(profile.card, matched.map((item) => item.term)),
      cited: false,
      via: { term: best.term, bridge: best.bridge },
    })
  }
  return results.sort((left, right) => right.score - left.score).slice(0, MAX_RESULTS)
}
