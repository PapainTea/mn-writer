/**
 * 引用出处。
 *
 * 出处卡片说明这条引用对应的来源，
 * 学习集里没有对应卡片时改为给出资料库的检索入口。
 */

import { ExternalLink, Plus, Search } from 'lucide-react'
import { cardSummary } from '../lib/cardSummary'
import { citationQuery } from '../lib/citationScan'
import type { CitationEntry } from '../lib/citationIndex'
import type { MnCard } from '../types'

interface CitationSourceProps {
  entry: CitationEntry
  onInsert: (card: MnCard) => void
  onFocus: (card: MnCard) => void
  onSearchLibrary: (query: string) => void
}

const PASSAGE_LIMIT = 88

function shortPassage(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= PASSAGE_LIMIT) return trimmed
  return trimmed.slice(0, PASSAGE_LIMIT) + '…'
}

export function CitationSource({
  entry,
  onInsert,
  onFocus,
  onSearchLibrary,
}: CitationSourceProps) {
  const card = entry.cards[0]
  const sameSource = entry.cards.length - 1
  const query = citationQuery(entry)

  if (!card) {
    return (
      <section className="citation-source is-missing">
        <header className="citation-source-head">
          <span className="citation-source-label">缺少来源</span>
          <span className="citation-source-text">{entry.text}</span>
        </header>
        <p className="citation-source-note">学习集里没有与这条引用对应的卡片。</p>
        <button
          type="button"
          className="citation-source-search"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSearchLibrary(query)}
          title={`按「${query}」检索资料库`}
        >
          <Search size={12} strokeWidth={2} />
          按「{query}」查找资料库
        </button>
      </section>
    )
  }

  const summary = cardSummary(card)
  return (
    <section className="citation-source">
      <header className="citation-source-head">
        <span className="citation-source-label">引用出处</span>
        <span className="citation-source-text">{entry.text}</span>
      </header>
      {summary.title && <p className="citation-source-title">{summary.title}</p>}
      {summary.body && <p className="citation-source-passage">{shortPassage(summary.body)}</p>}
      <p className="citation-source-meta">
        {card.documentTitle && <span>{card.documentTitle}</span>}
        {card.page !== undefined && <span>第 {card.page} 页</span>}
        {card.citationKey && <span>@{card.citationKey}</span>}
        {sameSource > 0 && <span>另有 {sameSource} 张同源卡片</span>}
      </p>
      <div className="citation-source-actions">
        <button
          type="button"
          className="mn-icon-button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onFocus(card)}
          title="在 MarginNote 中定位"
          aria-label={'在 MarginNote 中定位：' + summary.identifier}
        >
          <ExternalLink size={14} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="mn-icon-button citation-insert"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onInsert(card)}
          title="插入到正文"
          aria-label={'插入到正文：' + summary.identifier}
        >
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>
    </section>
  )
}
