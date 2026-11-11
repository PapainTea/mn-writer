/**
 * 证据条。
 *
 * 证据条出现在正在写的段落下方，按相关度给出学习集里的卡片。
 * 收起时只显示数量与命中的词，展开后列出卡片与来源。
 */

import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LibraryBig,
  Plus,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { useState } from 'react'
import { cardSummary, sameText } from '../lib/cardSummary'
import type { CardFeedbackValue } from '../lib/cardFeedback'
import { resolveUsageHint, type KnowledgeStore } from '../lib/knowledge'
import { relevanceFieldLabel, type RelevanceHit } from '../lib/relevance'
import type { MnCard } from '../types'
import { CardHeading } from './CardHeading'
import { HighlightedText } from './HighlightedText'

interface EvidenceStripProps {
  hits: RelevanceHit[]
  usage: Map<string, number>
  knowledge: KnowledgeStore
  documentId: string
  feedback: Map<string, CardFeedbackValue>
  onInsert: (card: MnCard) => void
  onFocus: (card: MnCard) => void
  onFeedback: (cardId: string, value: CardFeedbackValue) => void
}

const EXCERPT_LIMIT = 72

function shortExcerpt(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= EXCERPT_LIMIT) return trimmed
  return trimmed.slice(0, EXCERPT_LIMIT) + '…'
}

export function EvidenceStrip({
  hits,
  usage,
  knowledge,
  documentId,
  feedback,
  onInsert,
  onFocus,
  onFeedback,
}: EvidenceStripProps) {
  const [expanded, setExpanded] = useState(false)
  const top = hits[0]
  if (!top) return null

  const countLabel = hits.length + ' 张相关卡片'
  const topTitle = cardSummary(top.card).identifier

  return (
    <section className={'evidence-strip' + (expanded ? ' is-expanded' : '')}>
      <header className="evidence-head">
        <span className="evidence-marker">
          <LibraryBig size={14} strokeWidth={1.8} />
        </span>
        <span className="evidence-count">{countLabel}</span>
        {!expanded && <span className="evidence-top">{topTitle}</span>}
        <button
          type="button"
          className="mn-icon-button evidence-toggle"
          onClick={() => setExpanded((value) => !value)}
          onMouseDown={(event) => event.preventDefault()}
          title={expanded ? '收起证据' : '展开证据'}
          aria-label={expanded ? '收起证据' : '展开证据'}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUp size={15} strokeWidth={1.8} />
          ) : (
            <ChevronDown size={15} strokeWidth={1.8} />
          )}
        </button>
      </header>

      {expanded && (
        <div className="evidence-body">
          {hits.map((hit) => {
            const summary = cardSummary(hit.card)
            const hint = resolveUsageHint(hit.card.id, knowledge, usage, documentId)
            const mark = feedback.get(hit.card.id)
            return (
              <article
                className="evidence-item"
                key={hit.card.id}
                data-kind={hit.card.kind}
                data-mark={mark === 1 ? 'useful' : mark === -1 ? 'useless' : 'none'}
              >
                <div className="evidence-item-main">
                  <CardHeading summary={summary} className="evidence-item-title" />
                  {hit.passage && !sameText(hit.passage, summary.title) && (
                    <span className="evidence-item-passage">
                      <HighlightedText text={shortExcerpt(hit.passage)} terms={hit.terms} />
                    </span>
                  )}
                  <span className="evidence-item-meta">
                    {summary.source && <span>{summary.source}</span>}
                    {hit.card.citationKey && <span>@{hit.card.citationKey}</span>}
                    {hit.cited && <span className="evidence-item-cited">引用来源</span>}
                    {hit.fields.length > 0 && (
                      <span className="evidence-item-fields">
                        {hit.fields.slice(0, 2).map((field) => (
                          <span className="evidence-field" key={field}>
                            {relevanceFieldLabel(field)}命中
                          </span>
                        ))}
                      </span>
                    )}
                    {hit.via && (
                      <span
                        className="evidence-item-via"
                        title={`与当前段落的「${hit.via.bridge}」共同出现`}
                      >
                        经由「{hit.via.term}」
                      </span>
                    )}
                    {hint && (
                      <span className={hint.stale ? 'evidence-item-stale' : 'evidence-item-used'}>
                        {hint.text}
                      </span>
                    )}
                    {mark === 1 && <span className="evidence-item-mark">标记为有用</span>}
                    {mark === -1 && <span className="evidence-item-mark">标记为没用</span>}
                  </span>
                </div>
                <div className="evidence-item-actions">
                  <button
                    type="button"
                    className="mn-icon-button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onFocus(hit.card)}
                    title="在 MarginNote 中定位"
                    aria-label={'在 MarginNote 中定位：' + summary.identifier}
                  >
                    <ExternalLink size={14} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    className="mn-icon-button evidence-insert"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onInsert(hit.card)}
                    title="插入到正文"
                    aria-label={'插入到正文：' + summary.identifier}
                  >
                    <Plus size={14} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className={'mn-icon-button' + (mark === 1 ? ' is-active' : '')}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onFeedback(hit.card.id, 1)}
                    title={mark === 1 ? '取消「有用」' : '这条证据有用'}
                    aria-label={mark === 1 ? '取消「有用」' : '这条证据有用'}
                    aria-pressed={mark === 1}
                  >
                    <ThumbsUp size={14} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    className={'mn-icon-button' + (mark === -1 ? ' is-active' : '')}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onFeedback(hit.card.id, -1)}
                    title={mark === -1 ? '取消「没用」' : '这条证据没用'}
                    aria-label={mark === -1 ? '取消「没用」' : '这条证据没用'}
                    aria-pressed={mark === -1}
                  >
                    <ThumbsDown size={14} strokeWidth={1.8} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
