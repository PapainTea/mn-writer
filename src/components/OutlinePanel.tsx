import type { OutlineItem } from '../types'
import { EmptyState } from './EmptyState'

interface OutlinePanelProps {
  outline: OutlineItem[]
  coverage: Map<string, number>
  /** 键为节标识，值为该节缺少证据的断言数量。 */
  claimCounts: Map<string, number>
  /** 缺少证据的断言总数。 */
  claimTotal: number
  onSelect: (item: OutlineItem) => void
}

/** 大纲行的提示文字，说明该节的证据与断言情况。 */
function rowTitle(text: string, cards: number, missing: number): string {
  const parts: string[] = []
  if (cards > 0) parts.push(`${cards} 张证据卡片`)
  if (missing > 0) parts.push(`${missing} 处断言还没有证据`)
  if (parts.length === 0) return text
  return `${text}｜${parts.join('，')}`
}

export function OutlinePanel({
  outline,
  coverage,
  claimCounts,
  claimTotal,
  onSelect,
}: OutlinePanelProps) {
  if (outline.length === 0) {
    return (
      <div className="sidebar-panel outline-panel">
        <div className="sidebar-empty-group">
          <EmptyState>正文还没有标题。</EmptyState>
        </div>
      </div>
    )
  }

  const emptyCount = outline.filter((item) => (coverage.get(item.id) ?? 0) === 0).length

  return (
    <div className="sidebar-panel outline-panel">
      {(emptyCount > 0 || claimTotal > 0) && (
        <p className="outline-summary">
          {emptyCount > 0 && <span>{emptyCount} 节还没有引用卡片</span>}
          {emptyCount > 0 && claimTotal > 0 && <span className="outline-summary-sep">·</span>}
          {claimTotal > 0 && <span>{claimTotal} 处断言还没有证据</span>}
        </p>
      )}
      <nav className="outline-list" aria-label="文稿大纲">
        {outline.map((item) => {
          const cards = coverage.get(item.id) ?? 0
          const missing = claimCounts.get(item.id) ?? 0
          return (
            <button
              key={item.id}
              type="button"
              className="outline-row"
              data-level={item.level}
              onClick={() => onSelect(item)}
              title={rowTitle(item.text, cards, missing)}
            >
              <span className="outline-text">{item.text}</span>
              <span className="outline-badges">
                <span
                  className="outline-coverage"
                  data-empty={cards === 0}
                  title={cards === 0 ? '这一节还没有引用卡片' : `这一节引用了 ${cards} 张卡片`}
                >
                  {cards === 0 ? <span className="outline-dot" /> : cards}
                </span>
                {missing > 0 && (
                  <span className="outline-claim" title={`这一节有 ${missing} 处断言还没有证据`}>
                    {missing}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
