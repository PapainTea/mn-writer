import type { OutlineItem } from '../types'

interface OutlinePanelProps {
  outline: OutlineItem[]
  onSelect: (item: OutlineItem) => void
}

export function OutlinePanel({ outline, onSelect }: OutlinePanelProps) {
  if (outline.length === 0) {
    return (
      <div className="sidebar-panel outline-panel">
        <div className="sidebar-empty">
          正文还没有标题。
          <span className="sidebar-empty-hint">在空行输入 / 插入标题后，大纲会出现在这里。</span>
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar-panel outline-panel">
      <nav className="outline-list" aria-label="文稿大纲">
        {outline.map((item) => (
          <button
            key={item.id}
            type="button"
            className="outline-row"
            data-level={item.level}
            onClick={() => onSelect(item)}
            title={item.text}
          >
            <span className="outline-text">{item.text}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
