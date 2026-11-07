import { BookOpen, Clock, FileText, X } from 'lucide-react'
import { useEffect } from 'react'
import { readingMinutes, type DocumentStats } from '../lib/documentStats'

interface StatsPanelProps {
  open: boolean
  stats: DocumentStats
  onClose: () => void
}

interface StatItem {
  label: string
  value: string
}

/**
 * 文稿统计面板。
 *
 * 数据按「内容」与「结构」两组分区排列，
 * 每组内部按两列网格对齐，便于逐项核对。
 */
export function StatsPanel({ open, stats, onClose }: StatsPanelProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  const content: StatItem[] = [
    { label: '字数', value: stats.words.toLocaleString('zh-CN') },
    { label: '字符数（不计空格）', value: stats.characters.toLocaleString('zh-CN') },
    { label: '字符数（计空格）', value: stats.charactersWithSpaces.toLocaleString('zh-CN') },
    { label: '中文字符', value: stats.cjkCharacters.toLocaleString('zh-CN') },
    { label: '外文单词', value: stats.foreignWords.toLocaleString('zh-CN') },
  ]

  const structure: StatItem[] = [
    { label: '段落', value: stats.paragraphs.toLocaleString('zh-CN') },
    { label: '行', value: stats.lines.toLocaleString('zh-CN') },
    { label: '页', value: stats.pages.toLocaleString('zh-CN') },
    { label: '卡片', value: stats.cards.toLocaleString('zh-CN') },
    { label: '脚注', value: stats.footnotes.toLocaleString('zh-CN') },
    { label: '表格', value: stats.tables.toLocaleString('zh-CN') },
    { label: '图片', value: stats.images.toLocaleString('zh-CN') },
  ]

  return (
    <div className="stats-overlay" onPointerDown={onClose}>
      <div
        className="stats-panel"
        role="dialog"
        aria-modal="true"
        aria-label="文稿统计"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="stats-head">
          <div className="stats-title">
            <FileText size={16} strokeWidth={1.8} />
            文稿统计
          </div>
          <button type="button" className="mn-icon-button" onClick={onClose} title="关闭">
            <X size={17} />
          </button>
        </header>

        <div className="stats-highlight">
          <div className="stats-highlight-main">
            <span className="stats-highlight-value">
              {stats.words.toLocaleString('zh-CN')}
            </span>
            <span className="stats-highlight-label">字数</span>
          </div>
          <div className="stats-highlight-side">
            <span className="stats-reading">
              <Clock size={13} strokeWidth={1.8} />
              约 {readingMinutes(stats)} 分钟读完
            </span>
            <span className="stats-reading">
              <BookOpen size={13} strokeWidth={1.8} />
              {stats.paragraphs} 段 · {stats.cards} 张卡片
            </span>
          </div>
        </div>

        <section className="stats-section">
          <h3 className="stats-section-title">内容</h3>
          <dl className="stats-grid">
            {content.map((item) => (
              <div className="stats-cell" key={item.label}>
                <dt className="stats-cell-label">{item.label}</dt>
                <dd className="stats-cell-value">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="stats-section">
          <h3 className="stats-section-title">结构</h3>
          <dl className="stats-grid">
            {structure.map((item) => (
              <div className="stats-cell" key={item.label}>
                <dt className="stats-cell-label">{item.label}</dt>
                <dd className="stats-cell-value">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="stats-foot">
          行数与页数按每行 38 个字符、每页 36 行估算，仅供篇幅参考。
        </footer>
      </div>
    </div>
  )
}
