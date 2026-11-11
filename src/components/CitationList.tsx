/**
 * 引用出处清单。
 *
 * 清单列出当前所在节的引用，
 * 每条给出引用写法与来源状态，缺少来源时提供检索入口。
 */

import { Search } from 'lucide-react'
import { cardSummary } from '../lib/cardSummary'
import { citationQuery } from '../lib/citationScan'
import type { CitationEntry, CitationSection } from '../lib/citationIndex'
import { EmptyState } from './EmptyState'

interface CitationListProps {
  section: CitationSection | null
  /** 正文里是否有可用的写作位置。 */
  active: boolean
  onSelect: (entry: CitationEntry) => void
  onSearchLibrary: (query: string) => void
}

export function CitationList({ section, active, onSelect, onSearchLibrary }: CitationListProps) {
  const entries = section?.entries ?? []
  if (!active) {
    return <EmptyState kind="pending">暂无引用</EmptyState>
  }
  if (entries.length === 0) {
    return <EmptyState kind="pending">暂无引用</EmptyState>
  }

  return (
    <ul className="citation-list">
      {entries.map((entry) => {
        const card = entry.cards[0]
        return (
          <li className="citation-item" key={entry.id}>
            <button
              type="button"
              className="citation-item-main"
              onClick={() => onSelect(entry)}
              title="在正文里查看这条引用"
            >
              <span className="citation-item-text">{entry.text}</span>
              <span
                className={card ? 'citation-item-source' : 'citation-item-missing'}
              >
                {card ? cardSummary(card).identifier : '学习集没有对应卡片'}
              </span>
            </button>
            {!card && (
              <button
                type="button"
                className="citation-item-search"
                onClick={() => onSearchLibrary(citationQuery(entry))}
                title={`按「${citationQuery(entry)}」检索资料库`}
              >
                <Search size={12} strokeWidth={2} />
                查找
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
