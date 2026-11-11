import { useEditorState, type Editor } from '@tiptap/react'
import {
  Check,
  Download,
  FileJson,
  FileOutput,
  FileText,
  Feather,
  LayoutGrid,
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Plus,
  RefreshCw,
  Rows3,
  Sun,
  Upload,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CardViewMode } from '../lib/cardView'
import { collectDocumentStats } from '../lib/documentStats'
import type { ThemeMode } from '../lib/storage'

interface TopBarProps {
  title: string
  onTitleChange: (title: string) => void
  /** 是否有当前文稿。没有文稿时标题不可编辑。 */
  hasDocument: boolean
  saveState: 'saved' | 'saving' | 'idle' | 'error'
  editor: Editor | null
  theme: ThemeMode
  cardView: CardViewMode
  hasCards: boolean
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onOpenPicker: () => void
  onToggleFocus: () => void
  onToggleCardView: () => void
  onThemeChange: (theme: ThemeMode) => void
  onCopyMarkdown: () => void
  onDownloadMarkdown: () => void
  onDownloadJson: () => void
  onImportJson: (file: File) => void
  onOpenStats: () => void
  refreshing: boolean
  onRefreshCards: () => void
}

const THEME_ICON = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const THEME_LABEL = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
}

const THEME_OPTIONS = [
  { value: 'system' as const, label: THEME_LABEL.system, Icon: Monitor },
  { value: 'light' as const, label: THEME_LABEL.light, Icon: Sun },
  { value: 'dark' as const, label: THEME_LABEL.dark, Icon: Moon },
]

const INSERT_SHORTCUT = navigator.userAgent.includes('Mac') ? '⌘K' : 'Ctrl+K'
const FOCUS_SHORTCUT = navigator.userAgent.includes('Mac') ? '⌘⇧F' : 'Ctrl+Shift+F'

export function TopBar({
  title,
  onTitleChange,
  hasDocument,
  saveState,
  editor,
  theme,
  cardView,
  hasCards,
  sidebarOpen,
  onToggleSidebar,
  onOpenPicker,
  onToggleFocus,
  onToggleCardView,
  onThemeChange,
  onCopyMarkdown,
  onDownloadMarkdown,
  onDownloadJson,
  onImportJson,
  onOpenStats,
  refreshing,
  onRefreshCards,
}: TopBarProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ThemeIcon = THEME_ICON[theme]
  const wordCount =
    useEditorState({
      editor,
      selector: ({ editor: current }) => {
        if (!current || current.isDestroyed || !current.state?.schema) return 0
        return collectDocumentStats(current.getJSON()).words
      },
    }) ?? 0

  useEffect(() => {
    if (!exportOpen && !themeOpen && !moreOpen) return
    const close = (event: PointerEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false)
      if (!themeRef.current?.contains(event.target as Node)) setThemeOpen(false)
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [exportOpen, moreOpen, themeOpen])

  return (
    <header className="topbar">
      <button
        type="button"
        className="mn-icon-button topbar-icon"
        onClick={onToggleSidebar}
        title={sidebarOpen ? '收起侧栏' : '展开侧栏'}
        aria-label={sidebarOpen ? '收起侧栏' : '展开侧栏'}
        aria-expanded={sidebarOpen}
      >
        <PanelLeft size={18} strokeWidth={1.8} />
      </button>

      <div className="topbar-title">
        <div className="doc-title-row">
          <input
            className="doc-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            disabled={!hasDocument}
            aria-label="文稿标题"
            spellCheck={false}
          />
        </div>
        <div className="doc-meta">
          <span className={`save-dot is-${saveState}`} />
          <span>
            {saveState === 'saving'
              ? '保存中'
              : saveState === 'error'
                ? '本地保存失败'
                : '已保存'}
          </span>
          <span className="meta-sep">·</span>
          <button
            type="button"
            className="meta-button"
            onClick={onOpenStats}
            title="查看文稿统计"
            aria-label={`字数 ${wordCount.toLocaleString('zh-CN')}，查看文稿统计`}
          >
            {wordCount.toLocaleString('zh-CN')} 字
          </button>
        </div>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="mn-button is-primary"
          onClick={onOpenPicker}
          aria-label="插入卡片"
          title={`插入卡片（${INSERT_SHORTCUT}）`}
        >
          <Plus size={16} strokeWidth={2} />
          <span className="btn-label">插入卡片</span>
        </button>
        {hasCards && (
          <button
            type="button"
            className={`mn-button doc-refresh${refreshing ? ' is-refreshing' : ''}`}
            onClick={onRefreshCards}
            title="刷新全部卡片内容"
            aria-label="刷新全部卡片内容"
            aria-busy={refreshing}
            disabled={refreshing}
          >
            <RefreshCw size={15} strokeWidth={1.8} />
          </button>
        )}
        <div className="topbar-secondary">
          {hasCards && (
            <button
              type="button"
              className="mn-icon-button topbar-icon"
              onClick={onToggleCardView}
              title={`卡片视图：${cardView === 'compact' ? '简洁' : '完整'}（点击切换）`}
              aria-label={`卡片视图：${cardView === 'compact' ? '简洁' : '完整'}，点击切换`}
            >
              {cardView === 'compact' ? (
                <Rows3 size={17} strokeWidth={1.8} />
              ) : (
                <LayoutGrid size={17} strokeWidth={1.8} />
              )}
            </button>
          )}
          <div className="theme-wrap" ref={themeRef}>
            <button
              type="button"
              className="mn-icon-button topbar-icon"
              onClick={() => setThemeOpen((value) => !value)}
              title={`主题：${THEME_LABEL[theme]}`}
              aria-expanded={themeOpen}
            >
              <ThemeIcon size={17} strokeWidth={1.8} />
            </button>
            {themeOpen && (
              <div className="export-menu theme-menu" role="menu">
                {THEME_OPTIONS.map((option) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={theme === option.value}
                    key={option.value}
                    onClick={() => {
                      onThemeChange(option.value)
                      setThemeOpen(false)
                    }}
                  >
                    <option.Icon size={15} />
                    {option.label}
                    {theme === option.value && (
                      <span className="menu-check">
                        <Check size={13} strokeWidth={2.4} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="mn-icon-button topbar-icon"
            onClick={onToggleFocus}
            title={`进入专注（${FOCUS_SHORTCUT}）`}
            aria-label="进入专注"
          >
            <Feather size={17} strokeWidth={1.8} />
          </button>
          <div className="export-wrap" ref={exportRef}>
            <button
              type="button"
              className="mn-icon-button topbar-icon"
              onClick={() => setExportOpen((value) => !value)}
              title="导出"
              aria-expanded={exportOpen}
            >
              <FileOutput size={17} strokeWidth={1.8} />
            </button>
            {exportOpen && (
              <div className="export-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onCopyMarkdown()
                    setExportOpen(false)
                  }}
                >
                  <FileText size={15} /> 复制 Markdown
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onDownloadMarkdown()
                    setExportOpen(false)
                  }}
                >
                  <Download size={15} /> 下载 Markdown
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onDownloadJson()
                    setExportOpen(false)
                  }}
                >
                  <FileJson size={15} /> 下载 JSON 备份
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    fileInputRef.current?.click()
                    setExportOpen(false)
                  }}
                >
                  <Upload size={15} /> 从 JSON 恢复
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="topbar-more" ref={moreRef}>
          <button
            type="button"
            className="mn-icon-button topbar-icon"
            onClick={() => setMoreOpen((value) => !value)}
            title="更多操作"
            aria-label="更多操作"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal size={18} strokeWidth={1.8} />
          </button>
          {moreOpen && (
            <div className="export-menu topbar-more-menu" role="menu">
              {hasCards && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleCardView()
                    setMoreOpen(false)
                  }}
                >
                  {cardView === 'compact' ? (
                    <Rows3 size={15} />
                  ) : (
                    <LayoutGrid size={15} />
                  )}
                  卡片视图：{cardView === 'compact' ? '简洁' : '完整'}
                </button>
              )}
              <div className="more-section-label">主题</div>
              {THEME_OPTIONS.map((option) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === option.value}
                  key={option.value}
                  onClick={() => {
                    onThemeChange(option.value)
                    setMoreOpen(false)
                  }}
                >
                  <option.Icon size={15} />
                  {option.label}
                  {theme === option.value && (
                    <span className="menu-check">
                      <Check size={13} strokeWidth={2.4} />
                    </span>
                  )}
                </button>
              ))}
              <div className="mn-card-menu-sep" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onToggleFocus()
                  setMoreOpen(false)
                }}
              >
                <Feather size={15} strokeWidth={1.8} />
                进入专注
              </button>
              <div className="mn-card-menu-sep" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onCopyMarkdown()
                  setMoreOpen(false)
                }}
              >
                <FileText size={15} /> 复制 Markdown
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onDownloadMarkdown()
                  setMoreOpen(false)
                }}
              >
                <Download size={15} /> 下载 Markdown
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onDownloadJson()
                  setMoreOpen(false)
                }}
              >
                <FileJson size={15} /> 下载 JSON 备份
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  fileInputRef.current?.click()
                  setMoreOpen(false)
                }}
              >
                <Upload size={15} /> 从 JSON 恢复
              </button>
            </div>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) onImportJson(file)
          event.currentTarget.value = ''
        }}
      />
    </header>
  )
}
