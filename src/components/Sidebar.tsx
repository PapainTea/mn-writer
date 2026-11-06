import {
  Check,
  FilePlus2,
  FileText,
  LibraryBig,
  ListTree,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { cardColorIndex } from '../editor/cardColors'
import { setDraggedCard, takeDraggedCard } from '../editor/dragCard'
import { cardSummary } from '../lib/cardSummary'
import { relativeTime } from '../lib/format'
import type { MnCard, MnConnection, OutlineItem, WriterDocument } from '../types'
import { OutlinePanel } from './OutlinePanel'

type SidebarTab = 'docs' | 'cards' | 'outline'

interface SidebarProps {
  tab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  documents: WriterDocument[]
  activeId: string
  cards: MnCard[]
  insertedCounts: Map<string, number>
  cardQuery: string
  loadingCards: boolean
  outline: OutlineItem[]
  connection: MnConnection
  onRetryConnection: () => void
  onSelectDocument: (id: string) => void
  onNewDocument: () => void
  onDeleteDocument: (id: string) => void
  onCardQuery: (query: string) => void
  onInsertCard: (card: MnCard) => void
  onSelectOutline: (item: OutlineItem) => void
  onClose: () => void
  selectedCardId: string | null
}

interface ConnectionFooter {
  tone: 'idle' | 'error' | 'connecting' | 'mock'
  title: string
  hint: string
  retry: boolean
}

function connectionFooter(connection: MnConnection): ConnectionFooter | null {
  switch (connection.state) {
    case 'connected':
      return connection.truncated
        ? {
            tone: 'idle',
            title: '卡片列表已截断',
            hint: '当前学习集的卡片数量超过读取上限',
            retry: false,
          }
        : null
    case 'empty':
      return {
        tone: 'idle',
        title: '未打开学习集',
        hint: '在 MarginNote 中打开学习集后自动读取卡片',
        retry: false,
      }
    case 'error':
      return {
        tone: 'error',
        title: '无法读取卡片',
        hint: connection.message,
        retry: true,
      }
    case 'connecting':
      return {
        tone: 'connecting',
        title: '正在读取卡片',
        hint: '从 MarginNote 获取当前学习集',
        retry: false,
      }
    default:
      return {
        tone: 'mock',
        title: '演示数据',
        hint: '在 MarginNote 中打开面板后自动读取卡片',
        retry: false,
      }
  }
}

function emptyMessage(connection: MnConnection, query: string): string {
  if (connection.state === 'error') return '连接失败，请点击下方按钮重试'
  if (connection.state === 'empty') return '当前没有打开的学习集'
  return query.trim() ? '没有找到匹配的卡片' : '当前学习集没有卡片'
}

export function Sidebar({
  tab,
  onTabChange,
  documents,
  activeId,
  cards,
  insertedCounts,
  cardQuery,
  loadingCards,
  outline,
  connection,
  onRetryConnection,
  onSelectDocument,
  onNewDocument,
  onDeleteDocument,
  onCardQuery,
  onInsertCard,
  onSelectOutline,
  onClose,
  selectedCardId,
}: SidebarProps) {
  const footer = connectionFooter(connection)

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <button type="button" className="mn-icon-button sidebar-close" onClick={onClose} title="关闭侧栏">
          <X size={18} />
        </button>
      </div>

      <div className="sidebar-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'docs'}
          className={tab === 'docs' ? 'is-active' : ''}
          onClick={() => onTabChange('docs')}
        >
          <FileText size={15} /> 文稿
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'cards'}
          className={tab === 'cards' ? 'is-active' : ''}
          onClick={() => onTabChange('cards')}
        >
          <LibraryBig size={15} /> 卡片
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'outline'}
          className={tab === 'outline' ? 'is-active' : ''}
          onClick={() => onTabChange('outline')}
        >
          <ListTree size={15} /> 大纲
        </button>
      </div>

      {tab === 'docs' && (
        <div className="sidebar-panel">
          <button type="button" className="new-doc" onClick={onNewDocument}>
            <FilePlus2 size={16} /> 新建文稿
          </button>
          <div className="doc-list">
            {documents.map((doc) => (
              <div key={doc.id} className={`doc-row${doc.id === activeId ? ' is-active' : ''}`}>
                <button type="button" className="doc-row-main" onClick={() => onSelectDocument(doc.id)}>
                  <span className="doc-row-title">{doc.title || '未命名文稿'}</span>
                  <span className="doc-row-time">{relativeTime(doc.updatedAt)}</span>
                </button>
                <button
                  type="button"
                  className="doc-row-delete"
                  title="删除文稿"
                  onClick={() => onDeleteDocument(doc.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'outline' && <OutlinePanel outline={outline} onSelect={onSelectOutline} />}

      {tab === 'cards' && (
        <div className="sidebar-panel cards-panel">
          <label className="search-field">
            <Search size={15} />
            <input
              value={cardQuery}
              onChange={(event) => onCardQuery(event.target.value)}
              placeholder="搜索标题、摘录与标签"
              aria-label="搜索卡片"
            />
          </label>

          <div className="card-list">
            {loadingCards && <div className="sidebar-empty">正在读取卡片…</div>}
            {!loadingCards && cards.length === 0 && (
              <div className="sidebar-empty">{emptyMessage(connection, cardQuery)}</div>
            )}
            {cards.map((card) => {
              const inserted = insertedCounts.get(card.id) ?? 0
              const summary = cardSummary(card)
              const tags = card.tags.slice(0, 2)
              const isCurrent = card.id === selectedCardId
              return (
                <button
                  type="button"
                  key={card.id}
                  className="side-card"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-mn-card', card.id)
                    event.dataTransfer.setData('text/plain', card.id)
                    event.dataTransfer.effectAllowed = 'copy'
                    setDraggedCard(card)
                  }}
                  onDragEnd={() => takeDraggedCard()}
                  onClick={() => onInsertCard(card)}
                  title={
                    inserted > 0
                      ? `正文已有 ${inserted} 处引用，点击再插入一份`
                      : '点击插入到光标位置，或拖入正文'
                  }
                >
                  <span className="side-card-accent" data-tone={cardColorIndex(card.colorIndex)} />
                  <span className="side-card-body">
                    <span className="side-card-title">{summary.title}</span>
                    {summary.excerpt && (
                      <span className="side-card-excerpt">{summary.excerpt}</span>
                    )}
                    {summary.detail && <span className="side-card-meta">{summary.detail}</span>}
                    {(isCurrent || inserted > 0 || tags.length > 0) && (
                      <span className="side-card-tags">
                        {isCurrent && <span className="mn-tag is-current">当前</span>}
                        {inserted > 0 && (
                          <span className="mn-tag is-inserted">
                            <Check size={10} strokeWidth={2.4} />
                            {inserted > 1 ? `已插入 ${inserted}` : '已插入'}
                          </span>
                        )}
                        {tags.map((tag) => (
                          <span className="mn-tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {footer && (
        <div className={`sidebar-foot is-${footer.tone}`}>
          <span className="status-dot" />
          <span className="sidebar-foot-body">
            <span className="sidebar-foot-title" title={footer.title}>
              {footer.title}
            </span>
            <span className="sidebar-foot-hint" title={footer.hint}>
              {footer.hint}
            </span>
          </span>
          {footer.retry && (
            <button
              type="button"
              className="mn-icon-button sidebar-foot-retry"
              onClick={onRetryConnection}
              title="重新读取卡片"
              aria-label="重新读取卡片"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
