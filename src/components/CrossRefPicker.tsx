import { CornerDownLeft, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { groupCrossRefTargets, type CrossRefTarget } from '../lib/crossRef'

interface CrossRefPickerProps {
  open: boolean
  targets: CrossRefTarget[]
  onClose: () => void
  onInsert: (target: CrossRefTarget) => void
}

/**
 * 交叉引用选择面板。
 *
 * 面板按目标类型分区展示，标题与表格各自成组，
 * 便于在长文稿里快速定位要引用的对象。
 */
export function CrossRefPicker({ open, targets, onClose, onInsert }: CrossRefPickerProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const groups = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    const matched = trimmed
      ? targets.filter((target) => target.label.toLowerCase().includes(trimmed))
      : targets
    return groupCrossRefTargets(matched)
  }, [query, targets])

  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups])
  /** 每个目标在扁平列表里的序号，用于高亮与键盘选择。 */
  const indexOfTarget = useMemo(() => {
    const map = new Map<string, number>()
    flat.forEach((target, index) => map.set(target.id, index))
    return map
  }, [flat])

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
        setActive((value) => Math.min(value + 1, Math.max(flat.length - 1, 0)))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((value) => Math.max(value - 1, 0))
        return
      }
      if (event.key === 'Enter') {
        const target = flat[active]
        if (target) {
          event.preventDefault()
          onInsert(target)
          onClose()
        }
      }
    }
    const timer = window.setTimeout(() => window.addEventListener('keydown', onKeyDown), 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [active, flat, onClose, onInsert, open])

  if (!open) return null

  return (
    <div className="picker-overlay" onPointerDown={onClose}>
      <div
        className="picker crossref-picker"
        role="dialog"
        aria-modal="true"
        aria-label="插入交叉引用"
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
              placeholder="搜索标题与表格"
              aria-label="搜索引用目标"
            />
          </label>
          <button type="button" className="mn-icon-button" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="picker-list crossref-list" role="listbox">
          {flat.length === 0 && (
            <div className="picker-empty">
              {targets.length === 0 ? '正文还没有标题或表格。' : '没有找到匹配的目标。'}
            </div>
          )}
          {groups.map((group) => (
            <div key={group.kind} className="crossref-group">
              <div className="crossref-group-label">{group.label}</div>
              {group.items.map((target) => {
                const index = indexOfTarget.get(target.id) ?? 0
                return (
                  <button
                    type="button"
                    key={target.id}
                    role="option"
                    aria-selected={index === active}
                    className={`picker-row crossref-row${index === active ? ' is-active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => {
                      onInsert(target)
                      onClose()
                    }}
                  >
                    <span className="crossref-number">{target.number}</span>
                    <span className="crossref-label">{target.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="picker-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> 选择
          </span>
          <span>
            <kbd>
              <CornerDownLeft size={11} />
            </kbd>
            插入
          </span>
          <span>
            <kbd>Esc</kbd> 关闭
          </span>
        </div>
      </div>
    </div>
  )
}
