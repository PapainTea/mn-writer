/**
 * 助手依据清单。
 *
 * 清单给出每张卡片的编号、标识、来源与原文片段，
 * 并提供在 MarginNote 中定位的入口。
 * 建议正文里的编号徽标指向清单里的条目。
 */

import { ExternalLink } from 'lucide-react'
import type { MnCard } from '../types'
import { EmptyState } from './EmptyState'
import { HighlightedText } from './HighlightedText'

export interface AssistantEvidenceItem {
  /** 编号，从 1 开始。 */
  number: number
  /** 卡片标识。 */
  title: string
  /** 来源说明：文献名与页码。 */
  source: string
  /** 原文片段。 */
  excerpt: string
  /** 命中的检索词。 */
  terms: string[]
  /** 对应的卡片。 */
  card: MnCard
  /** 概念扩展命中时的关联路径。 */
  via?: { term: string; bridge: string }
}

interface AssistantEvidenceProps {
  items: AssistantEvidenceItem[]
  /** 当前指向的编号。 */
  active: number | null
  onActive: (number: number | null) => void
  onFocus: (card: MnCard) => void
}

export function AssistantEvidenceList({ items, active, onActive, onFocus }: AssistantEvidenceProps) {
  if (items.length === 0) {
    return (
      <EmptyState className="assistant-evidence-empty">
        当前段落没有匹配到卡片，助手只能依据选区本身作答。
      </EmptyState>
    )
  }
  return (
    <ul className="assistant-evidence">
      {items.map((item) => (
        <li
          key={item.card.id}
          className={
            'assistant-evidence-item' + (active === item.number ? ' is-active' : '')
          }
          data-number={item.number}
        >
          <button
            type="button"
            className="assistant-evidence-number"
            onClick={() => onActive(active === item.number ? null : item.number)}
            title="在建议里定位这条依据"
            aria-label={'在建议里定位依据 ' + item.number}
            aria-pressed={active === item.number}
          >
            {item.number}
          </button>
          <span className="assistant-evidence-body">
            <span className="assistant-evidence-head">
              <span className="assistant-evidence-title">{item.title}</span>
              <button
                type="button"
                className="mn-icon-button"
                onClick={() => onFocus(item.card)}
                title="在 MarginNote 中定位"
                aria-label={'在 MarginNote 中定位：' + item.title}
              >
                <ExternalLink size={13} strokeWidth={1.8} />
              </button>
            </span>
            {item.source && (
              <span className="assistant-evidence-source">{item.source}</span>
            )}
            {item.via && (
              <span
                className="assistant-evidence-via"
                title={`与当前段落的「${item.via.bridge}」共同出现`}
              >
                经由「{item.via.term}」
              </span>
            )}
            {item.excerpt && (
              <span className="assistant-evidence-excerpt">
                <HighlightedText text={item.excerpt} terms={item.terms} />
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
