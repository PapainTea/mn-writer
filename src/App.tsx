import type { Editor, JSONContent } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { Square } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { BubbleToolbar } from './components/BubbleToolbar'
import { CardPicker } from './components/CardPicker'
import { CrossRefPicker } from './components/CrossRefPicker'
import { FootnoteDialog } from './components/FootnoteDialog'
import { ResizeGrip } from './components/ResizeGrip'
import { Sidebar } from './components/Sidebar'
import { StatsPanel } from './components/StatsPanel'
import { TopBar } from './components/TopBar'
import { takeDraggedCard } from './editor/dragCard'
import { loadDocumentContent } from './editor/documentLoad'
import { createExtensions } from './editor/extensions'
import { insertCardBlock } from './editor/insertCard'
import { registerSlashActions, slashActions } from './editor/slashActions'
import { useCrossRefTargets, useDocumentInsertions } from './hooks/useDocumentInsertions'
import { useDocumentExport } from './hooks/useDocumentExport'
import { useEditorDerivedState } from './hooks/useEditorDerivedState'
import { useSelectedCardIds } from './hooks/useSelectedCardId'
import { useWriterDocuments } from './hooks/useWriterDocuments'
import { getCardViewMode, setCardViewMode, subscribeCardView } from './lib/cardView'
import { EMPTY_DOC } from './lib/document'
import { pinSelectedCards } from './lib/cardOrder'
import { filterCards } from './lib/cardSearch'
import { countInsertedCards } from './lib/inserted'
import { jumpToOutline } from './lib/outline'
import { usePanelSizeRestore } from './hooks/usePanelSizeRestore'
import { collectDocumentStats } from './lib/documentStats'
import { isCompactLayout, watchCompactLayout } from './lib/layout'
import { loadTheme, persistTheme, type ThemeMode } from './lib/storage'
import { subscribeToast } from './lib/toast'
import { getAdapter } from './mn'
import type { MnCard, OutlineItem } from './types'

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme())
  const [sidebarOpen, setSidebarOpen] = useState(() => !isCompactLayout())
  const [sidebarTab, setSidebarTab] = useState<'docs' | 'cards' | 'outline'>('cards')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [allCards, setAllCards] = useState<MnCard[]>([])
  const [loadingCards, setLoadingCards] = useState(true)
  const [cardQuery, setCardQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const adapter = useMemo(() => getAdapter(), [])
  usePanelSizeRestore()
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

  const extensions = useMemo(
    () =>
      createExtensions({
        onInsertCard: () => slashActions().insertCard(),
        onInsertFootnote: () => slashActions().insertFootnote(),
        onInsertCrossRef: () => slashActions().insertCrossRef(),
      }),
    [],
  )

  // 编辑器实例随文稿一起重建。
  // ProseMirror 的撤销栈属于编辑器实例，若跨文稿共用同一个实例，
  // 切换文稿后的撤销操作会回滚上一份文稿的编辑，并把那份内容写进当前文稿。
  const editorDocumentId = activeId

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
    [extensions, editorDocumentId],
  )

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  const { outline, insertedCounts, syncDerivedState, scheduleDerivedState } =
    useEditorDerivedState(editor)
  useEffect(() => {
    scheduleDerivedStateRef.current = scheduleDerivedState
  }, [scheduleDerivedState])

  /** 可被交叉引用的目标，随正文变化更新。 */
  const crossRefDoc = useEditorState({
    editor,
    selector: ({ editor: current }) => (current ? current.getJSON() : null),
  })
  const crossRefTargets = useCrossRefTargets(crossRefDoc)

  /** 文稿统计数据，供统计面板展示。 */
  const stats = useMemo(() => {
    if (!crossRefDoc) return collectDocumentStats({ type: 'doc', content: [] })
    return collectDocumentStats(crossRefDoc)
  }, [crossRefDoc])

  const {
    crossRefOpen,
    setCrossRefOpen,
    footnoteRequest,
    insertFootnote,
    requestFootnote,
    insertCrossRef,
  } = useDocumentInsertions(editor, setToast)

  useEffect(() => {
    registerSlashActions({
      insertCard: () => setPickerOpen(true),
      insertFootnote: requestFootnote,
      insertCrossRef: () => setCrossRefOpen(true),
    })
  }, [requestFootnote, setCrossRefOpen])

  // 编辑器实例随文稿重建，装载内容由实例的初始内容完成。
  // 这里按编辑器实例记录已装载的文稿，避免同一实例重复装载。
  const loadedEditorRef = useRef<{ editor: Editor; documentId: string } | null>(null)
  useEffect(() => {
    if (!editor) return
    if (loadedEditorRef.current?.editor === editor) return
    loadedEditorRef.current = { editor, documentId: activeId }
    const document = getDocument(activeId)
    if (!document) return
    const timer = window.setTimeout(() => {
      // 装载文稿属于结构替换，不进入撤销栈，也不触发自动保存。
      loadDocumentContent(editor, document.content)
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
    const unwatch = watchCompactLayout((compact) => {
      if (compact) {
        autoClosedRef.current = true
        setSidebarOpen(false)
        return
      }
      if (autoClosedRef.current) {
        autoClosedRef.current = false
        setSidebarOpen(true)
      }
    })
    return unwatch
  }, [])

  const selectedCardIds = useSelectedCardIds(!focusMode && connection.state === 'connected')

  const cards = useMemo(
    () => pinSelectedCards(filterCards(allCards, cardQuery), selectedCardIds),
    [allCards, cardQuery, selectedCardIds],
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
      if (isCompactLayout()) setSidebarOpen(false)
    },
    [editor, syncDerivedState],
  )

  useEffect(() => {
    // 斜杠菜单请求插入脚注时执行插入。
    if (footnoteRequest === 0) return
    insertFootnote()
  }, [footnoteRequest, insertFootnote])

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
      if (isCompactLayout()) setSidebarOpen(false)
    },
    [selectDocument],
  )

  const handleNewDocument = useCallback(() => {
    newDocument()
    setSidebarTab('docs')
    if (isCompactLayout()) setSidebarOpen(false)
  }, [newDocument])

  const toggleCardView = useCallback(() => {
    setCardViewMode(getCardViewMode() === 'compact' ? 'full' : 'compact')
  }, [])

  const selectOutline = useCallback(
    (item: OutlineItem) => {
      if (!editor) return
      jumpToOutline(editor, item)
      if (isCompactLayout()) setSidebarOpen(false)
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

  const { copyMarkdown, downloadMarkdown, downloadJson, importJson } = useDocumentExport({
    editor,
    title: activeDocument?.title ?? '',
    onToast: setToast,
    importDocument,
  })

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
            selectedCardIds={selectedCardIds}
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
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => {
              autoClosedRef.current = false
              setSidebarOpen((value) => !value)
            }}
            onOpenPicker={() => setPickerOpen(true)}
            onToggleFocus={() => setFocusMode((value) => !value)}
            onToggleCardView={toggleCardView}
            onThemeChange={setTheme}
            onCopyMarkdown={copyMarkdown}
            onDownloadMarkdown={downloadMarkdown}
            onDownloadJson={downloadJson}
            onImportJson={importJson}
            onOpenStats={() => setStatsOpen(true)}
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
        selectedCardIds={selectedCardIds}
      />

      <CrossRefPicker
        open={crossRefOpen}
        targets={crossRefTargets}
        onClose={() => setCrossRefOpen(false)}
        onInsert={insertCrossRef}
      />

      <StatsPanel open={statsOpen} stats={stats} onClose={() => setStatsOpen(false)} />

      <FootnoteDialog />

      {toast && <div className="toast">{toast}</div>}

      <ResizeGrip />
    </div>
  )
}
