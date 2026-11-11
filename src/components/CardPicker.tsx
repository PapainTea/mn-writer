import { Check, CircleDot, CornerDownLeft, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { pinSelectedCards } from '../lib/cardOrder'
import { filterCards } from '../lib/cardSearch'
import { cardSummary } from '../lib/cardSummary'
import type { MnCard } from '../types'
import { CardHeading } from './CardHeading'
import { EmptyState } from './EmptyState'

interface CardPickerProps {
  open: boolean
  cards: MnCard[]
  insertedCounts: Map<string, number>
  loading: boolean
  onClose: () => void
  onInsert: (card: MnCard) => void
  selectedCardIds: string[]
}

export function CardPicker({
  open,
  cards,
  insertedCounts,
  loading,
  onClose,
  onInsert,
  selectedCardIds,
}: CardPickerProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () => pinSelectedCards(filterCards(cards, query), selectedCardIds),
    [cards, query, selectedCardIds],
  )

  useEffect(() => {
    if (!open) return
    // 每次打开面板都回到干净的搜索状态，并聚焦输入框。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery('')
    setActive(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((value) => Math.min(value + 1, Math.max(filtered.length - 1, 0)))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((value) => Math.max(value - 1, 0))
        return
      }
      if (event.key === 'Enter') {
        const card = filtered[active]
        if (card) {
          event.preventDefault()
          onInsert(card)
          onClose()
        }
      }
    }
    // The picker opens from the slash menu's Enter keydown. Bind after that
    // event finishes bubbling, otherwise the same keystroke inserts a card.
    const timer = window.setTimeout(() => window.addEventListener('keydown', onKeyDown), 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [active, filtered, onClose, onInsert, open])

  if (!open) return null

  return (
    <div className="picker-overlay" onPointerDown={onClose}>
      <div
        className="picker"
        role="dialog"
        aria-modal="true"
        aria-label="插入 MarginNote 卡片"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="picker-head">
          <label className="search-field picker-search">
            <Search size={16} />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              placeholder="搜索卡片"
              aria-label="搜索卡片"
            />
          </label>
          <button type="button" className="mn-icon-button" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="picker-list" role="listbox">
          {loading && (
            <EmptyState className="picker-empty" kind="loading">
              正在读取卡片…
            </EmptyState>
          )}
          {!loading && filtered.length === 0 && (
            <EmptyState className="picker-empty" kind="failed">
              没有找到匹配的卡片
            </EmptyState>
          )}
          {filtered.map((card, index) => {
            const inserted = insertedCounts.get(card.id) ?? 0
            const summary = cardSummary(card)
            const isCurrent = selectedCardIds.includes(card.id)
            return (
              <button
                type="button"
                key={card.id}
                role="option"
                aria-selected={index === active}
                className={`picker-row${index === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => {
                  onInsert(card)
                  onClose()
                }}
              >
                <span className="picker-accent" data-kind={card.kind} />
                <span className="picker-body">
                  <CardHeading summary={summary} className="picker-title" />
                  {summary.body && <span className="picker-excerpt">{summary.body}</span>}
                  <span className="picker-meta">
                    {summary.detail}
                    {card.citationKey ? ` · @${card.citationKey}` : ''}
                    {isCurrent && (
                      <span className="picker-current">
                        <CircleDot size={10} strokeWidth={2.4} />
                        当前
                      </span>
                    )}
                    {inserted > 0 && (
                      <span className="picker-inserted">
                        <Check size={10} strokeWidth={2.4} />
                        {inserted > 1 ? `已插入 ${inserted}` : '已插入'}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="picker-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> 选择
          </span>
          <span>
            <kbd><CornerDownLeft size={11} /></kbd> 插入
          </span>
          <span>
            <kbd>Esc</kbd> 关闭
          </span>
        </div>
      </div>
    </div>
  )
}
