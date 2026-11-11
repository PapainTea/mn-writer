/**
 * 联想扩展。
 *
 * 直接命中只覆盖与当前段落字面重合的卡片。
 * 联想扩展以命中的卡片为桥梁，沿卡片关联再走一跳，
 * 让作者看到当前段落之外仍然相关的材料。
 */

import type { MnCard } from '../types'
import type { CardFeedbackValue } from './cardFeedback'
import { buildRelationIndex, findCardRelations, type RelationIndex, type RelationKind } from './relations'
import type { RelevanceHit } from './relevance'

/** 关联分的下限，低于该值的关联不带进结果。 */
const MIN_RELATION_SCORE = 0.35
/** 桥梁卡片的位次权重，位次越靠前权重越高。 */
const BRIDGE_WEIGHTS = [1, 0.85, 0.72]
/** 每个桥梁最多考察的关联数量。 */
const RELATIONS_PER_BRIDGE = 6
/** 每个桥梁最多贡献的条数。 */
const PER_BRIDGE_LIMIT = 2

export interface AssociationIndex extends RelationIndex {
  /** 参与联想的卡片。 */
  cards: MnCard[]
}

export function buildAssociationIndex(cards: MnCard[]): AssociationIndex {
  return { cards, terms: buildRelationIndex(cards).terms }
}

export interface AssociationHit {
  /** 关联到的卡片。 */
  card: MnCard
  /** 桥梁卡片，与当前段落直接命中的卡片。 */
  via: MnCard
  /** 关联类型。 */
  kind: RelationKind
  /** 关联理由。 */
  reason: string
  /** 得分。 */
  score: number
}

export interface AssociationOptions {
  /** 排除的卡片，例如正文已经插入的卡片。 */
  excludeIds?: Set<string>
  /** 作者对检索结果的判断。 */
  feedback?: Map<string, CardFeedbackValue>
  /** 桥梁数量上限。 */
  bridgeLimit?: number
  /** 返回数量上限。 */
  limit?: number
}

const ASSOCIATION_LABELS: Record<RelationKind, string> = {
  citation: '同一文献条目',
  document: '同一篇文献',
  tag: '共享标签',
  content: '内容相近',
}

/** 联想理由的中文说明。 */
export function associationLabel(hit: AssociationHit): string {
  if (hit.kind === 'tag' || hit.kind === 'content') {
    return `${ASSOCIATION_LABELS[hit.kind]} ${hit.reason}`
  }
  return ASSOCIATION_LABELS[hit.kind]
}

/**
 * 从直接命中出发展开联想。
 *
 * 桥梁取直接命中的前几张卡片，
 * 关联分与桥梁权重相乘得到得分，
 * 同一张卡片经多条路径到达时保留得分最高的一条。
 */
export function findAssociations(
  catalog: AssociationIndex,
  hits: RelevanceHit[],
  options: AssociationOptions = {},
): AssociationHit[] {
  const limit = options.limit ?? 4
  const bridgeLimit = options.bridgeLimit ?? BRIDGE_WEIGHTS.length
  if (hits.length === 0 || limit <= 0) return []

  const direct = new Set(hits.map((hit) => hit.card.id))
  const bridges = hits.slice(0, bridgeLimit)
  const best = new Map<string, AssociationHit>()

  bridges.forEach((bridge, rank) => {
    const weight = BRIDGE_WEIGHTS[rank] ?? 0.6
    const relations = findCardRelations(
      bridge.card,
      catalog.cards,
      RELATIONS_PER_BRIDGE,
      catalog,
    )
    // 每种关联类型只保留得分最高的一条，
    // 避免联想全部落在同一篇文献里，失去横向探索的意义。
    const perKind = new Map<RelationKind, (typeof relations)[number]>()
    for (const relation of relations) {
      if (relation.score < MIN_RELATION_SCORE) continue
      const current = perKind.get(relation.kind)
      if (!current || relation.score > current.score) {
        perKind.set(relation.kind, relation)
      }
    }
    const picked = [...perKind.values()]
      .sort((left, right) => right.score - left.score)
      .slice(0, PER_BRIDGE_LIMIT)
    for (const relation of picked) {
      const id = relation.card.id
      if (direct.has(id)) continue
      if (options.excludeIds?.has(id)) continue
      if (options.feedback?.get(id) === -1) continue
      const score = weight * relation.score
      const current = best.get(id)
      if (current && current.score >= score) continue
      best.set(id, {
        card: relation.card,
        via: bridge.card,
        kind: relation.kind,
        reason: relation.reason,
        score,
      })
    }
  })

  return [...best.values()]
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.card.title.trim() || left.card.documentTitle?.trim() || '').localeCompare(
          right.card.title.trim() || right.card.documentTitle?.trim() || '',
        ),
    )
    .slice(0, limit)
}
