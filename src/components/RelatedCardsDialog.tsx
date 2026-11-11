/**
 * 相关卡片弹层。
 *
 * 弹层沿着一张卡片向四周延伸，
 * 让作者沿着文献、标签与内容相近的线索继续走。
 */

import { ExternalLink, Network, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cardSummary } from '../lib/cardSummary'
import { findCardRelations, RELATION_LABELS, type RelationKind } from '../lib/relations'
import type { MnCard } from '../types'
import { CardHeading } from './CardHeading'

interface RelatedCardsDialogProps {
  card: MnCard | null
  cards: MnCard[]
  onClose: () => void
  onInsert: (card: MnCard) => void
  onFocus: (card: MnCard) => void
}

interface DialogRowProps {
  card: MnCard
  reason: string
  kind?: RelationKind
  onInsert: (card: MnCard) => void
  onFocus: (card: MnCard) => void
}

function DialogRow({ card, reason, kind, onInsert, onFocus }: DialogRowProps) {
  const summary = cardSummary(card)
  const locateLabel = '在 MarginNote 中定位：' + summary.identifier
  const insertLabel = '插入到正文：' + summary.identifier
  return (
    <article className="related-dialog-row" data-kind={card.kind}>
      <div className="related-dialog-main">
        <CardHeading summary={summary} className="related-dialog-row-title" />
        <span className="related-dialog-row-reason">
          {kind ? <span className="related-dialog-kind">{RELATION_LABELS[kind]}</span> : null}
          <span className="related-dialog-reason-text">{reason}</span>
        </span>
      </div>
      <div className="related-dialog-actions">
        <button
          type="button"
          className="mn-icon-button"
          onClick={() => onFocus(card)}
          title="在 MarginNote 中定位"
          aria-label={locateLabel}
        >
          <ExternalLink size={14} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="mn-icon-button related-insert"
          onClick={() => onInsert(card)}
          title="插入到正文"
          aria-label={insertLabel}
        >
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>
    </article>
  )
}

export function RelatedCardsDialog({
  card,
  cards,
  onClose,
  onInsert,
  onFocus,
}: RelatedCardsDialogProps) {
  const [scope, setScope] = useState<'related' | 'all'>('related')
  const relations = useMemo(() => (card ? findCardRelations(card, cards) : []), [card, cards])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (card && event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [card, onClose])

  if (!card) return null

  return (
    <div className="picker-overlay" onPointerDown={onClose}>
      <div
        className="related-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="相关卡片"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="related-dialog-head">
          <span className="related-dialog-marker">
            <Network size={15} strokeWidth={1.8} />
          </span>
          <div className="related-dialog-headings">
            <span className="related-dialog-eyebrow">关联网络</span>
            <span className="related-dialog-title">{cardSummary(card).identifier}</span>
          </div>
          <button type="button" className="mn-icon-button" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="related-dialog-scope">
          <button
            type="button"
            className={scope === 'related' ? 'is-active' : ''}
            onClick={() => setScope('related')}
          >
            相关卡片
          </button>
          <button
            type="button"
            className={scope === 'all' ? 'is-active' : ''}
            onClick={() => setScope('all')}
          >
            全部卡片
          </button>
        </div>

        <div className="related-dialog-body">
          {scope === 'related' &&
            relations.map((relation) => (
              <DialogRow
                card={relation.card}
                kind={relation.kind}
                key={relation.card.id}
                reason={relation.reason}
                onInsert={onInsert}
                onFocus={onFocus}
              />
            ))}
          {scope === 'all' &&
            cards
              .filter((item) => item.id !== card.id)
              .slice(0, 40)
              .map((item) => (
                <DialogRow
                  card={item}
                  key={item.id}
                  reason={cardSummary(item).source || '本地卡片'}
                  onInsert={onInsert}
                  onFocus={onFocus}
                />
              ))}
          {scope === 'related' && relations.length === 0 && (
            <div className="picker-empty">这张卡片还没有可以追溯的关联。</div>
          )}
        </div>

        <div className="related-dialog-foot">
          <span>关联依据：同一文献条目、同一篇文献、共享标签、内容相近</span>
        </div>
      </div>
    </div>
  )
}
