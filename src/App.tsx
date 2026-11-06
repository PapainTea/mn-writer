import type { Editor, JSONContent } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor } from '@tiptap/react'
import { Square } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { BubbleToolbar } from './components/BubbleToolbar'
import { CardPicker } from './components/CardPicker'
import { ResizeGrip } from './components/ResizeGrip'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { takeDraggedCard } from './editor/dragCard'
import { createExtensions } from './editor/extensions'
import { insertCardBlock } from './editor/insertCard'
import { useEditorDerivedState } from './hooks/useEditorDerivedState'
import { useSelectedCardId } from './hooks/useSelectedCardId'
import { useWriterDocuments } from './hooks/useWriterDocuments'
import { getCardViewMode, setCardViewMode, subscribeCardView } from './lib/cardView'
import { EMPTY_DOC } from './lib/document'
import { documentTitleFromFile, parseDocumentFile } from './lib/documentFile'
import { docToMarkdown } from './lib/markdown'
import { pinSelectedCard } from './lib/cardOrder'
import { filterCards } from './lib/cardSearch'
import { countInsertedCards } from './lib/inserted'
import { jumpToOutline } from './lib/outline'
import { applyPanelSize, readStoredPanelSize } from './lib/panelSize'
import { loadTheme, persistTheme, type ThemeMode } from './lib/storage'
import { subscribeToast } from './lib/toast'
import { getAdapter } from './mn'
import type { MnCard, OutlineItem } from './types'

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function safeFilename(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '-').trim() || '未命名文稿'
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme())
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia('(min-width: 960px)').matches)
  const [sidebarTab, setSidebarTab] = useState<'docs' | 'cards' | 'outline'>('cards')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [allCards, setAllCards] = useState<MnCard[]>([])
  const [loadingCards, setLoadingCards] = useState(true)
  const [cardQuery, setCardQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const adapter = useMemo(() => getAdapter(), [])
  const cardView = useSyncExternalStore(subscribeCardView, getCardViewMode, getCardViewMode)
  const connection = useSyncExternalStore(
    adapter.subscribeConnection,
    adapter.getConnection,
    adapter.getConnection,
  )
  const handleStorageFailure = useCallback(() => {
    setToast('本地存储不可用，请导出 JSON 备份')
  }, [])
  const {
    documents,
    activeId,
    activeDocument,
    activeDocumentId,
    getDocument,
    saveState,
    flushSave,
    scheduleSave,
    selectDocument,
    newDocument,
    importDocument,
    deleteDocument,
    renameDocument,
  } = useWriterDocuments(handleStorageFailure)

  const scheduleSaveRef = useRef<(content: JSONContent, quiet?: boolean) => void>(() => undefined)
  useEffect(() => {
    scheduleSaveRef.current = scheduleSave
  }, [scheduleSave])

  // 记录侧栏是否由宽度变化收起，用户主动关闭侧栏时不在恢复范围内。
  const autoClosedRef = useRef(false)

  const scheduleDerivedStateRef = useRef<(current: Editor) => void>(() => undefined)
  const editorRef = useRef<Editor | null>(null)

  const extensions = useMemo(() => createExtensions(() => setPickerOpen(true)), [])

  const editor = useEditor(
    {
      extensions,
      content: activeDocument?.content ?? EMPTY_DOC,
      editorProps: {
        attributes: {
          class: 'mn-editor',
          spellcheck: 'true',
        },
        handleDrop: (view, event) => {
          const card = takeDraggedCard()
          if (!card) return false
          const current = editorRef.current
          if (!current) return false
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
          const position = coords?.pos ?? view.state.doc.content.size
          if (!insertCardBlock(current, card, position)) return false
          const count = countInsertedCards(current.getJSON()).get(card.id) ?? 1
          setToast(
            count > 1
              ? `已插入「${card.title}」，正文共有 ${count} 处引用`
              : `已插入「${card.title}」`,
          )
          event.preventDefault()
          return true
        },
      },
      shouldRerenderOnTransaction: false,
      onUpdate: ({ editor: current }) => {
        scheduleSaveRef.current(current.getJSON(), !current.isFocused)
        scheduleDerivedStateRef.current(current)
      },
    },
    [extensions],
  )

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  const { outline, insertedCounts, syncDerivedState, scheduleDerivedState } =
    useEditorDerivedState(editor)
  useEffect(() => {
    scheduleDerivedStateRef.current = scheduleDerivedState
  }, [scheduleDerivedState])

  const loadedDocumentId = useRef(activeDocumentId)

  useEffect(() => {
    if (!editor || loadedDocumentId.current === activeId) return
    loadedDocumentId.current = activeId
    const document = getDocument(activeId)
    if (!document) return
    const timer = window.setTimeout(() => {
      editor.commands.setContent(document.content, { emitUpdate: false })
      syncDerivedState(editor)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeId, editor, getDocument, syncDerivedState])

  const refreshSeq = useRef(0)
  const refreshCards = useCallback(
    async (options?: { silent?: boolean }) => {
      const seq = refreshSeq.current + 1
      refreshSeq.current = seq
      if (!options?.silent) setLoadingCards(true)
      try {
        const list = await adapter.listCards()
        if (seq === refreshSeq.current) setAllCards(list)
      } catch {
        if (seq === refreshSeq.current) setAllCards([])
      } finally {
        if (seq === refreshSeq.current) setLoadingCards(false)
      }
    },
    [adapter],
  )

  useEffect(() => {
    // 挂载后读取一次学习集卡片，结果由 refreshCards 写回状态。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCards()
  }, [refreshCards])

  useEffect(() => {
    // 页面加载完成后恢复上次的面板尺寸，MarginNote 会在加载完成时调用一次 fit。
    const restore = () => {
      const stored = readStoredPanelSize()
      if (stored) applyPanelSize(stored)
    }
    window.addEventListener('load', restore, { once: true })
    const timer = window.setTimeout(restore, 600)
    return () => {
      window.removeEventListener('load', restore)
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 959px)')
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        autoClosedRef.current = true
        setSidebarOpen(false)
        return
      }
      if (autoClosedRef.current) {
        autoClosedRef.current = false
        setSidebarOpen(true)
      }
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const selectedCardId = useSelectedCardId(!focusMode && connection.state === 'connected')

  const cards = useMemo(
    () => pinSelectedCard(filterCards(allCards, cardQuery), selectedCardId),
    [allCards, cardQuery, selectedCardId],
  )

  useEffect(
    () =>
      adapter.subscribeChange(() => {
        void refreshCards({ silent: true })
      }),
    [adapter, refreshCards],
  )

  useEffect(() => {
    const refresh = () => {
      void refreshCards({ silent: true })
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refreshCards])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.dataset.theme = theme
    persistTheme(theme)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyThemeColor = () => {
      const effective = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', effective === 'dark' ? '#121311' : '#f4f1ea')
    }
    applyThemeColor()
    if (theme !== 'system') return
    media.addEventListener('change', applyThemeColor)
    return () => media.removeEventListener('change', applyThemeColor)
  }, [theme])

  useEffect(() => subscribeToast(setToast), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const insertCard = useCallback(
    (card: MnCard) => {
      if (!editor) return
      const { selection } = editor.state
      const cursor = selection.empty ? selection.$from : selection.$to
      const position =
        selection instanceof NodeSelection
          ? selection.to
          : cursor.depth > 0
            ? cursor.after(1)
            : selection.to
      if (!insertCardBlock(editor, card, position)) {
        setToast('插入失败，请重试')
        return
      }
      const count = countInsertedCards(editor.getJSON()).get(card.id) ?? 1
      syncDerivedState(editor)
      setToast(
        count > 1
          ? `已插入「${card.title}」，正文共有 ${count} 处引用`
          : `已插入「${card.title}」`,
      )
      setPickerOpen(false)
      if (window.matchMedia('(max-width: 959px)').matches) setSidebarOpen(false)
    },
    [editor, syncDerivedState],
  )

  /** 刷新正文内全部卡片内容，同时重新读取侧栏卡片列表。 */
  const refreshAllCards = useCallback(async () => {
    if (!editor || refreshing) return

    const positions: { pos: number; cardId: string }[] = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'cardBlock') return
      const cardId =
        typeof node.attrs.cardId === 'string' && node.attrs.cardId
          ? node.attrs.cardId
          : ((node.attrs.snapshot as { id?: string } | null)?.id ?? '')
      if (cardId) positions.push({ pos, cardId })
    })
    if (positions.length === 0) {
      setToast('正文没有插入卡片')
      return
    }

    const documentId = activeDocumentId
    setRefreshing(true)
    try {
      const ids = [...new Set(positions.map((item) => item.cardId))]
      const cards = await adapter.getCards(ids)
      const byId = new Map(cards.map((card) => [card.id, card]))
      const failed = ids.filter((id) => !byId.has(id))

      if (activeDocumentId !== documentId) return

      const tr = editor.state.tr
      // 位置倒序更新，避免前面的替换影响后面的偏移量。
      for (const item of [...positions].reverse()) {
        const card = byId.get(item.cardId)
        if (!card) continue
        const node = editor.state.doc.nodeAt(item.pos)
        if (!node || node.type.name !== 'cardBlock') continue
        tr.setNodeMarkup(item.pos, undefined, {
          ...node.attrs,
          cardId: card.id,
          snapshot: card,
        })
      }
      if (tr.steps.length > 0) editor.view.dispatch(tr)

      syncDerivedState(editor)
      void refreshCards({ silent: true })

      if (failed.length === 0) {
        setToast('已刷新所有卡片内容')
      } else if (cards.length === 0) {
        setToast('刷新失败，请稍后重试')
      } else {
        setToast(`已刷新 ${cards.length} 张卡片，${failed.length} 张刷新失败`)
      }
    } catch {
      setToast('刷新失败，请稍后重试')
    } finally {
      setRefreshing(false)
    }
  }, [adapter, activeDocumentId, editor, refreshCards, refreshing, syncDerivedState])

  const handleSelectDocument = useCallback(
    (id: string) => {
      selectDocument(id)
      if (window.matchMedia('(max-width: 959px)').matches) setSidebarOpen(false)
    },
    [selectDocument],
  )

  const handleNewDocument = useCallback(() => {
    newDocument()
    setSidebarTab('docs')
    if (window.matchMedia('(max-width: 959px)').matches) setSidebarOpen(false)
  }, [newDocument])

  const toggleCardView = useCallback(() => {
    setCardViewMode(getCardViewMode() === 'compact' ? 'full' : 'compact')
  }, [])

  const selectOutline = useCallback(
    (item: OutlineItem) => {
      if (!editor) return
      jumpToOutline(editor, item)
      if (window.matchMedia('(max-width: 959px)').matches) setSidebarOpen(false)
    },
    [editor],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey
      if (modifier && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPickerOpen(true)
        return
      }
      if (modifier && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        setToast(flushSave() ? '文稿已保存到本地' : '保存失败，请导出 JSON 备份')
        return
      }
      if (modifier && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setFocusMode((value) => !value)
        return
      }
      if (event.key === 'Escape' && !pickerOpen && focusMode) setFocusMode(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flushSave, focusMode, pickerOpen])

  const copyMarkdown = useCallback(async () => {
    if (!editor) return
    const markdown = docToMarkdown(editor.getJSON())
    try {
      await navigator.clipboard.writeText(markdown)
      setToast('Markdown 已复制')
    } catch {
      setToast('复制失败，请检查剪贴板权限')
    }
  }, [editor])

  const copyMarkdownFile = useCallback(() => {
    if (!editor) return
    downloadFile(
      `${safeFilename(activeDocument?.title ?? '')}.md`,
      docToMarkdown(editor.getJSON()),
      'text/markdown',
    )
    setToast('Markdown 已下载')
  }, [activeDocument?.title, editor])

  const downloadJson = useCallback(() => {
    if (!editor) return
    downloadFile(
      `${safeFilename(activeDocument?.title ?? '')}.json`,
      JSON.stringify(editor.getJSON(), null, 2),
      'application/json',
    )
    setToast('JSON 备份已下载')
  }, [activeDocument?.title, editor])

  const importJson = useCallback(
    async (file: File) => {
      if (!editor) return
      try {
        const content = parseDocumentFile(await file.text())
        editor.schema.nodeFromJSON(content)
        const title = documentTitleFromFile(file.name)
        const imported = importDocument(title, content)
        setSidebarTab('docs')
        if (window.matchMedia('(max-width: 959px)').matches) setSidebarOpen(false)
        setToast(`已恢复「${imported.title}」`)
      } catch (error) {
        setToast(error instanceof Error ? error.message : '导入失败，请检查文件内容')
      }
    },
    [editor, importDocument],
  )

  return (
    <div className={`app${sidebarOpen ? '' : ' sidebar-closed'}${focusMode ? ' is-focus' : ''}`}>
      {sidebarOpen && (
        <>
          <Sidebar
            tab={sidebarTab}
            onTabChange={setSidebarTab}
            documents={documents}
            activeId={activeId}
            cards={cards}
            insertedCounts={insertedCounts}
            cardQuery={cardQuery}
            loadingCards={loadingCards}
            outline={outline}
            connection={connection}
            onRetryConnection={() => void refreshCards()}
            onSelectDocument={handleSelectDocument}
            onNewDocument={handleNewDocument}
            onDeleteDocument={deleteDocument}
            onCardQuery={setCardQuery}
            onInsertCard={insertCard}
            onSelectOutline={selectOutline}
            onClose={() => setSidebarOpen(false)}
            selectedCardId={selectedCardId}
          />
          <button
            type="button"
            className="sidebar-backdrop"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setSidebarOpen(false)}
          />
        </>
      )}

      <main className="main">
        {!focusMode && (
          <TopBar
            title={activeDocument?.title ?? ''}
            onTitleChange={renameDocument}
            saveState={saveState}
            editor={editor}
            theme={theme}
            cardView={cardView}
            hasCards={insertedCounts.size > 0}
            onToggleSidebar={() => {
              autoClosedRef.current = false
              setSidebarOpen((value) => !value)
            }}
            onOpenPicker={() => setPickerOpen(true)}
            onToggleFocus={() => setFocusMode((value) => !value)}
            onToggleCardView={toggleCardView}
            onThemeChange={setTheme}
            onCopyMarkdown={copyMarkdown}
            onDownloadMarkdown={copyMarkdownFile}
            onDownloadJson={downloadJson}
            onImportJson={importJson}
            studySetTitle={connection.state === 'connected' ? (connection.topicTitle ?? null) : null}
            refreshing={refreshing}
            onRefreshCards={() => void refreshAllCards()}
          />
        )}

        <div className="editor-scroll">
          <div className="editor-column">
            <EditorContent editor={editor} />
          </div>
        </div>

        {focusMode && (
          <button
            type="button"
            className="focus-exit"
            onClick={() => setFocusMode(false)}
            title="退出专注（Esc）"
            aria-label="退出专注"
          >
            <Square size={14} strokeWidth={1.8} />
            退出专注
          </button>
        )}
      </main>

      {editor && !focusMode && <BubbleToolbar editor={editor} />}

      <CardPicker
        open={pickerOpen}
        cards={allCards}
        insertedCounts={insertedCounts}
        loading={loadingCards}
        onClose={() => setPickerOpen(false)}
        onInsert={insertCard}
        selectedCardId={selectedCardId}
      />

      {toast && <div className="toast">{toast}</div>}

      <ResizeGrip />
    </div>
  )
}
