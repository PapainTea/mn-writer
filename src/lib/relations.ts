/**
 * 卡片关联。
 *
 * 关联依据有四种：同一条文献、同一个文献条目、共享标签、内容相近。
 * 每条关联都给出理由，作者据此判断这张卡片值不值得跟过去看。
 */

import type { MnCard } from '../types'
import { normalizeText, tokenize } from './tokenize'

export type RelationKind = 'citation' | 'document' | 'tag' | 'content'

/** 排序用的卡片名称。卡片没有标题时用文献名。 */
function sortKey(card: MnCard): string {
  return card.title.trim() || card.documentTitle?.trim() || ''
}

export interface CardRelation {
  card: MnCard
  kind: RelationKind
  score: number
  reason: string
}

const CONTENT_WEIGHT = 0.5
const TAG_WEIGHT = 0.26
const MAX_TAG_SCORE = 0.62

function termSet(card: MnCard): Set<string> {
  return new Set(
    tokenize([card.title, card.excerpt, ...card.comments.map((comment) => comment.text)].join('\n')),
  )
}

export interface RelationIndex {
  /** 卡片标识到卡片内容涉及的检索词。 */
  terms: Map<string, Set<string>>
}

/**
 * 为一组卡片建立检索词索引。
 *
 * 关联计算需要逐对比较卡片内容，
 * 索引把检索词的计算集中到一次，
 * 避免每次比较都重新切词。
 */
export function buildRelationIndex(cards: MnCard[]): RelationIndex {
  const terms = new Map<string, Set<string>>()
  for (const card of cards) {
    terms.set(card.id, termSet(card))
  }
  return { terms }
}

/** 两张卡片的内容重合度。 */
function contentSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const term of left) {
    if (right.has(term)) shared += 1
  }
  return shared / Math.min(left.size, right.size)
}

function sharedTags(left: MnCard, right: MnCard): string[] {
  const set = new Set(left.tags)
  return right.tags.filter((tag) => set.has(tag))
}

/**
 * 找出与目标卡片相关的其他卡片。
 *
 * 关联按得分降序排列，同分时按卡片标题排序。
 */
export function findCardRelations(
  target: MnCard,
  cards: MnCard[],
  limit = 6,
  index?: RelationIndex,
): CardRelation[] {
  const targetTerms = termSet(target)
  const targetKey = target.citationKey?.toLowerCase() ?? ''
  const targetDocument = normalizeText(target.documentTitle ?? '')

  const relations: CardRelation[] = []
  for (const card of cards) {
    if (card.id === target.id) continue
    let score = 0
    let kind: RelationKind = 'content'
    let reason = ''

    const key = card.citationKey?.toLowerCase() ?? ''
    if (targetKey && key === targetKey) {
      score = 1
      kind = 'citation'
      reason = card.citationKey ?? '同一文献条目'
    } else if (targetDocument && normalizeText(card.documentTitle ?? '') === targetDocument) {
      score = 0.78
      kind = 'document'
      reason = card.documentTitle ?? '同一篇文献'
    }

    const tags = sharedTags(target, card)
    const tagScore = Math.min(tags.length * TAG_WEIGHT, MAX_TAG_SCORE)
    if (tagScore > score) {
      score = tagScore
      kind = 'tag'
      reason = tags.slice(0, 3).join('、')
    }

    const similarity = contentSimilarity(targetTerms, index?.terms.get(card.id) ?? termSet(card))
    const contentScore = similarity * CONTENT_WEIGHT
    if (contentScore > score) {
      score = contentScore
      kind = 'content'
      reason = '重合 ' + Math.round(similarity * 100) + '%'
    }

    if (score <= 0.2) continue
    relations.push({ card, kind, score, reason })
  }

  relations.sort(
    (left, right) =>
      right.score - left.score ||
      sortKey(left.card).localeCompare(sortKey(right.card)),
  )
  return relations.slice(0, limit)
}

/** 关联类型的中文说明。 */
export const RELATION_LABELS: Record<RelationKind, string> = {
  citation: '条目',
  document: '文献',
  tag: '标签',
  content: '内容',
}
