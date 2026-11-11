/**
 * 卡片相关度引擎。
 *
 * 思路来自检索：把当前写作段落当作查询，把学习集里的卡片当作文档。
 * 命中权重按字段区分，标题与标签远重于批注；
 * 词的稀有度用逆文档频率衡量，出现在大量卡片里的词几乎不参与打分；
 * 覆盖率记录一张卡片承接了查询多少内容，覆盖越广排名越靠前。
 */

import type { MnCard } from '../types'
import { feedbackFactor, type CardFeedbackValue } from './cardFeedback'
import { sameText } from './cardSummary'
import { usageFactor } from './knowledge'
import { locateTerms, tokenize } from './tokenize'

export type RelevanceField = 'title' | 'content' | 'tags' | 'document' | 'comments'

/**
 * 字段权重。
 *
 * 标题与正文是卡片的主要内容，权重高于标签与文献。
 * 摘录卡没有标题，正文因此承担主要的匹配作用。
 */
const FIELD_WEIGHTS: Record<RelevanceField, number> = {
  title: 3.2,
  content: 3,
  tags: 2.4,
  document: 1.6,
  comments: 0.85,
}

const FIELD_LABELS: Record<RelevanceField, string> = {
  title: '标题',
  content: '正文',
  tags: '标签',
  document: '文献',
  comments: '批注',
}

/** 低于该逆文档频率的词视为噪声，不参与打分。 */
const MIN_IDF = 0.35
/** 命中权重低于该值的卡片不进入结果。 */
const MIN_SCORE = 1.2
/** 单个词在同一字段里最多计三次，避免长文重复刷分。 */
const MAX_TERM_COUNT = 3

/**
 * 反馈分层。
 *
 * 作者的判断优先于检索得分：判定有用的证据排在最前，
 * 判定没用的证据排到最后。
 */
function feedbackTier(value: CardFeedbackValue | undefined, cited: boolean): number {
  if (value === 1) return 0
  if (cited) return 1
  if (value === -1) return 3
  return 2
}

export interface RelevanceQuery {
  /** 当前写作段落或选区的文字。 */
  text: string
  /** 所在标题，作为补充线索。 */
  heading?: string
  /** 上一段的文字，权重低于当前段落。 */
  previous?: string
}

export interface RelevanceHit {
  card: MnCard
  score: number
 /** 归一化到 0 至 1 的覆盖率。 */
  coverage: number
 /** 命中的字段。 */
  fields: RelevanceField[]
  /** 命中的检索词，供界面标出关联点。 */
  terms: string[]
  /** 来源里与当前写作对应的原文片段。 */
  passage: string
  /** 这张卡片是正文里写下的引用所对应的来源。 */
  cited: boolean
  /** 概念扩展命中时的关联路径。 */
  via?: { term: string; bridge: string }
}

type TermMap = Map<string, number>

export interface CardProfile {
  id: string
  card: MnCard
  fields: Record<RelevanceField, TermMap>
  /** 全部检索词，用于长度归一。 */
  total: number
}

export interface RelevanceIndex {
  profiles: Map<string, CardProfile>
  /** 检索词到逆文档频率。 */
  idf: Map<string, number>
  docCount: number
}

/**
 * 参与匹配的卡片正文。
 *
 * 正文与标题文字相同时只算标题，正文不再重复计入。
 */
function cardContent(card: MnCard): string {
  const excerpt = card.excerpt.trim()
  if (!excerpt) return card.preview?.trim() ?? ''
  return sameText(excerpt, card.title) ? '' : excerpt
}

function countTerms(text: string): TermMap {
  const map: TermMap = new Map()
  for (const term of tokenize(text)) {
    map.set(term, (map.get(term) ?? 0) + 1)
  }
  return map
}

function cardProfile(card: MnCard): CardProfile {
  const fields: Record<RelevanceField, TermMap> = {
    title: countTerms(card.title),
    content: countTerms(cardContent(card)),
    tags: countTerms(card.tags.join(' ')),
    document: countTerms(card.documentTitle ?? ''),
    comments: countTerms(card.comments.map((comment) => comment.text).join(' ')),
  }
  let total = 0
  for (const map of Object.values(fields)) {
    for (const count of map.values()) total += count
  }
  return { id: card.id, card, fields, total }
}

/**
 * 为一组卡片建立检索索引。
 *
 * 卡片内容变化时重建一次，查询过程只做哈希查找。
 */
export function buildRelevanceIndex(cards: MnCard[]): RelevanceIndex {
  const profiles = new Map<string, CardProfile>()
  const documentFrequency = new Map<string, number>()
  for (const card of cards) {
    const profile = cardProfile(card)
    profiles.set(card.id, profile)
    const unique = new Set<string>()
    for (const map of Object.values(profile.fields)) {
      for (const term of map.keys()) unique.add(term)
    }
    for (const term of unique) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1)
    }
  }
  const docCount = Math.max(cards.length, 1)
  const idf = new Map<string, number>()
  for (const [term, frequency] of documentFrequency) {
    idf.set(term, Math.log(1 + docCount / (1 + frequency)))
  }
  return { profiles, idf, docCount }
}

export interface RelevanceOptions {
  /** 排除的卡片，例如正文已经插入的卡片。 */
  excludeIds?: Set<string>
  /** 作者对检索结果的判断，用于调整得分。 */
  feedback?: Map<string, CardFeedbackValue>
  /** 卡片在历次写作中的使用次数。 */
  usage?: Map<string, number>
  /** 正文里写下的引用所对应的卡片，排在最前。 */
  citedIds?: Set<string>
  /** 返回数量上限。 */
  limit?: number
}

interface ScoredTerm {
  term: string
  idf: number
  fields: RelevanceField[]
}

/** 原文片段的最长字数。 */
const MAX_PASSAGE_LENGTH = 90

const SENTENCE_BOUNDARY = /[。！？；.!?;]/

/** 取命中位置所在的句子，过长时截断。 */
function extractPassage(text: string, position: number): string {
  // 小数点与省略号不算句末，否则「0.31」会被切成两半。
  const isBoundary = (index: number): boolean => {
    const char = text[index] ?? ''
    if (!SENTENCE_BOUNDARY.test(char)) return false
    if (char === '.' || char === '…') {
      const before = text[index - 1] ?? ''
      const after = text[index + 1] ?? ''
      if (/\d/.test(before) && /\d/.test(after)) return false
    }
    return true
  }
  let start = 0
  for (let index = position - 1; index >= 0 && position - index < MAX_PASSAGE_LENGTH; index -= 1) {
    if (isBoundary(index)) {
      start = index + 1
      break
    }
  }
  let end = text.length
  for (let index = position; index < text.length && index - position < MAX_PASSAGE_LENGTH; index += 1) {
    if (isBoundary(index)) {
      end = index + 1
      break
    }
  }
  const slice = text.slice(start, end).trim()
  if (slice.length <= MAX_PASSAGE_LENGTH) return slice
  return `${slice.slice(0, MAX_PASSAGE_LENGTH)}…`
}

/**
 * 从来源里取出与当前写作对应的原文。
 *
 * 取稀有度最高的命中词所在句子，
 * 没有命中时退回摘录开头，让作者看到卡片讲了什么。
 */
function findPassage(card: MnCard, terms: string[], idf: Map<string, number>): string {
  const sources = [card.excerpt, ...card.comments.map((comment) => comment.text)].filter(
    (value): value is string => Boolean(value && value.trim()),
  )
  let best = { text: '', weight: 0 }
  for (const source of sources) {
    const text = source.replace(/\s+/g, ' ').trim()
    const located = locateTerms(terms, text)
    for (const [term, positions] of located) {
      const weight = idf.get(term) ?? 0
      if (weight <= best.weight) continue
      best = { text: extractPassage(text, positions[0] ?? 0), weight }
    }
  }
  if (best.text) return best.text
  const fallback = sources[0]?.replace(/\s+/g, ' ').trim() ?? ''
  return fallback.length > MAX_PASSAGE_LENGTH
    ? `${fallback.slice(0, MAX_PASSAGE_LENGTH)}…`
    : fallback
}

/**
 * 按查询检索相关卡片。
 *
 * 结果按得分降序排列，得分相近时覆盖率高的排在前面。
 */
export function searchRelevantCards(
  index: RelevanceIndex,
  query: RelevanceQuery,
  options: RelevanceOptions = {},
): RelevanceHit[] {
  const limit = options.limit ?? 6
  const exclude = options.excludeIds
  if (limit <= 0) return []

  const queryTerms = new Map<string, number>()
  for (const term of tokenize(query.text)) queryTerms.set(term, 1)
  // 标题只占查询权重的一部分，避免标题词淹没段落本身。
  for (const term of tokenize(query.heading ?? '')) {
    queryTerms.set(term, Math.max(queryTerms.get(term) ?? 0, 0.8))
  }
  // 上一段提供承接线索，权重最低。
  for (const term of tokenize(query.previous ?? '')) {
    queryTerms.set(term, Math.max(queryTerms.get(term) ?? 0, 0.45))
  }
  if (queryTerms.size === 0) return []

  let totalIdf = 0
  const usable: { term: string; idf: number; weight: number }[] = []
  for (const [term, weight] of queryTerms) {
    const idf = index.idf.get(term) ?? 0
    if (idf < MIN_IDF) continue
    usable.push({ term, idf, weight })
    totalIdf += idf * weight
  }
  if (usable.length === 0 || totalIdf <= 0) return []

  const hits: RelevanceHit[] = []
  for (const card of index.profiles.values()) {
    if (exclude?.has(card.id)) continue
    let score = 0
    let matchedIdf = 0
    const scored: ScoredTerm[] = []
    for (const item of usable) {
      let weight = 0
      const fields: RelevanceField[] = []
      for (const field of Object.keys(FIELD_WEIGHTS) as RelevanceField[]) {
        const count = card.fields[field].get(item.term)
        if (!count) continue
        fields.push(field)
        weight += FIELD_WEIGHTS[field] * Math.min(count, MAX_TERM_COUNT)
      }
      if (weight <= 0) continue
      score += item.idf * weight * item.weight
      matchedIdf += item.idf * item.weight
      scored.push({ term: item.term, idf: item.idf, fields })
    }
    if (score < MIN_SCORE) continue
    const coverage = Math.min(matchedIdf / totalIdf, 1)
    // 覆盖率把「命中很多词但都很少见」的卡片排到后面。
    const factor = feedbackFactor(options.feedback?.get(card.card.id))
    const finalScore =
      score * (0.6 + 0.8 * coverage) * factor * usageFactor(options.usage?.get(card.card.id))
    if (finalScore < MIN_SCORE) continue
    const terms = scored
      .slice()
      .sort((left, right) => right.idf - left.idf)
      .map((item) => item.term)
    hits.push({
      card: card.card,
      score: finalScore,
      coverage,
      fields: [...new Set(scored.flatMap((item) => item.fields))],
      terms: terms.slice(0, 8),
      passage: findPassage(
        card.card,
        terms,
        index.idf,
      ),
      cited: options.citedIds?.has(card.card.id) ?? false,
    })
  }

  // 正文里写下的引用，其来源卡片一定出现在结果里。
  for (const id of options.citedIds ?? []) {
    if (hits.length >= limit) break
    if (exclude?.has(id)) continue
    if (hits.some((hit) => hit.card.id === id)) continue
    const card = index.profiles.get(id)?.card
    if (!card) continue
    const excerpt = card.excerpt.replace(/\s+/g, ' ').trim()
    hits.push({
      card,
      score: 0,
      coverage: 0,
      fields: [],
      terms: [],
      passage:
        excerpt.length > MAX_PASSAGE_LENGTH
          ? `${excerpt.slice(0, MAX_PASSAGE_LENGTH)}…`
          : excerpt,
      cited: true,
    })
  }

  hits.sort((left, right) => {
    const tier =
      feedbackTier(options.feedback?.get(left.card.id), left.cited) -
      feedbackTier(options.feedback?.get(right.card.id), right.cited)
    if (tier !== 0) return tier
    return right.score - left.score || right.coverage - left.coverage
  })
  return hits.slice(0, limit)
}

/** 命中字段的中文说明，用于解释推荐理由。 */
export function relevanceFieldLabel(field: RelevanceField): string {
  return FIELD_LABELS[field]
}
