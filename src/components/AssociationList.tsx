/**
 * 联想列表。
 *
 * 联想由直接命中的卡片延伸而来，跨越当前段落。
 * 每条给出关联理由与桥梁卡片，作者据此判断是否跟过去看。
 */

import { ExternalLink, Plus } from 'lucide-react'
import { associationLabel, type AssociationHit } from '../lib/associations'
import { cardSummary } from '../lib/cardSummary'
import { CardHeading } from './CardHeading'
import type { MnCard } from '../types'

interface AssociationListProps {
  associations: AssociationHit[]
  onInsert: (card: MnCard) => void
  onFocus: (card: MnCard) => void
}

export function AssociationList({ associations, onInsert, onFocus }: AssociationListProps) {
  if (associations.length === 0) return null
  return (
    <div className="related-list">
      {associations.map((item) => {
        const summary = cardSummary(item.card)
        const via = cardSummary(item.via).identifier
        return (
          <article
            className="related-card related-association"
            key={item.card.id}
            data-kind={item.card.kind}
          >
            <span className="related-card-accent" />
            <div className="related-card-main">
              <CardHeading summary={summary} className="related-card-title" />
              <span className="related-card-meta">
                {summary.source && <span className="related-card-source">{summary.source}</span>}
                <span className="related-association-reason">
                  {associationLabel(item)} · 经由《{via}》
                </span>
              </span>
            </div>
            <div className="related-card-actions">
              <button
                type="button"
                className="mn-icon-button"
                onClick={() => onFocus(item.card)}
                title="在 MarginNote 中定位"
                aria-label={'在 MarginNote 中定位：' + summary.identifier}
              >
                <ExternalLink size={13} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                className="mn-icon-button related-insert"
                onClick={() => onInsert(item.card)}
                title="插入到正文"
                aria-label={'插入到正文：' + summary.identifier}
              >
                <Plus size={13} strokeWidth={2} />
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
