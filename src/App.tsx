import type { Editor, JSONContent } from '@tiptap/core'
import { EditorContent, useEditorState } from '@tiptap/react'
import { Square } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { BubbleToolbar } from './components/BubbleToolbar'
import { AssistantPanel, type AssistRange } from './components/AssistantPanel'
import { CardPicker } from './components/CardPicker'
import { CrossRefPicker } from './components/CrossRefPicker'
import { FootnoteDialog } from './components/FootnoteDialog'
import { ParagraphSurface } from './components/ParagraphSurface'
import { RelatedCardsDialog } from './components/RelatedCardsDialog'
import { ModelSettingsDialog } from './components/ModelSettingsDialog'
import { ResizeGrip } from './components/ResizeGrip'
import { Sidebar } from './components/Sidebar'
import { StatsPanel } from './components/StatsPanel'
import { TopBar } from './components/TopBar'
import { citationPluginKey, selectCitation } from './editor/citationPlugin'
import { setCitationCards } from './editor/citationRegistry'
import { loadDocumentContent } from './editor/documentLoad'
import { createExtensions } from './editor/extensions'
import { registerSlashActions, slashActions } from './editor/slashActions'
import { useCrossRefTargets, useDocumentInsertions } from './hooks/useDocumentInsertions'
import { useDocumentExport } from './hooks/useDocumentExport'
import { useCardLibrary } from './hooks/useCardLibrary'
import { useCardRefresh } from './hooks/useCardRefresh'
import { useCardFocus } from './hooks/useCardFocus'
import { useCardInsertion } from './hooks/useCardInsertion'
import { useEditorDerivedState } from './hooks/useEditorDerivedState'
import { useKnowledge } from './hooks/useKnowledge'
import { useLibraryActions } from './hooks/useLibraryActions'
import { useWritingEvidence } from './hooks/useWritingEvidence'
import { useSelectedCardIds } from './hooks/useSelectedCardId'
import { useWriterDocuments } from './hooks/useWriterDocuments'
import { useWriterEditor } from './hooks/useWriterEditor'
import { useSnapshotSync } from './hooks/useSnapshotSync'
import { getCardViewMode, setCardViewMode, subscribeCardView } from './lib/cardView'
import { cardFeedbackMap, nextFeedback } from './lib/cardFeedback'
import { cardUsageMap } from './lib/cardUsage'
import { buildClaimIndex } from './lib/claims'
import { EMPTY_CITATION_INDEX, type CitationEntry } from './lib/citationIndex'
import { knowledgeCountMap } from './lib/knowledge'
import { EMPTY_DOC } from './lib/document'
import { pinSelectedCards } from './lib/cardOrder'
import { filterCards } from './lib/cardSearch'
import { cardLabel } from './lib/cardSummary'
import { jumpToOutline, jumpToPosition } from './lib/outline'
import { subscribeRelatedCards } from './lib/relatedCardsEvent'
import { usePanelSizeRestore } from './hooks/usePanelSizeRestore'
import { useWriterShortcuts } from './hooks/useWriterShortcuts'
import { useWriterTheme } from './hooks/useWriterTheme'
import { collectDocumentStats } from './lib/documentStats'
import { isCompactLayout, watchCompactLayout } from './lib/layout'
import { subscribeToast } from './lib/toast'
import { getAdapter } from './mn'
import type { MnCard, OutlineItem } from './types'

export default function App() {
  const [theme, setTheme] = useWriterTheme()
  const [sidebarOpen, setSidebarOpen] = useState(() => !isCompactLayout())
  const [sidebarTab, setSidebarTab] = useState<'docs' | 'cards' | 'related' | 'outline'>('cards')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [cardQuery, setCardQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [relatedTarget, setRelatedTarget] = useState<MnCard | null>(null)
  const [assistRange, setAssistRange] = useState<AssistRange | null>(null)
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false)
  /** 文稿内容装载完成的次数，文稿切换后旧快照需要重新补齐。 */
  const [loadedRevision, setLoadedRevision] = useState(0)

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
    recordCardUsage,
    setCardFeedback,
  } = useWriterDocuments(handleStorageFailure)

  const scheduleSaveRef = useRef<(content: JSONContent, quiet?: boolean) => void>(() => undefined)
  useEffect(() => {
    scheduleSaveRef.current = scheduleSave
  }, [scheduleSave])

  /** 卡片在历次写作中的使用记录。 */
  const { store: knowledge, record: recordKnowledge } = useKnowledge()

  // 编辑器实例在文稿之间重建，拖拽插入时通过引用读取最新的记录函数。
  const recordCardUseRef = useRef<(cardId: string) => void>(() => undefined)
  useEffect(() => {
    recordCardUseRef.current = (cardId: string) => {
      recordCardUsage(cardId)
      recordKnowledge(cardId, activeDocumentId, activeDocument?.title ?? '')
    }
  }, [activeDocument?.title, activeDocumentId, recordCardUsage, recordKnowledge])

  // 记录侧栏是否由宽度变化收起，用户主动关闭侧栏时不在恢复范围内。
  const autoClosedRef = useRef(false)

  const scheduleDerivedStateRef = useRef<(current: Editor) => void>(() => undefined)

  const extensions = useMemo(
    () =>
      createExtensions({
        onInsertCard: () => slashActions().insertCard(),
        onInsertFootnote: () => slashActions().insertFootnote(),
        onInsertCrossRef: () => slashActions().insertCrossRef(),
      }),
    [],
  )

  // 编辑器实例随文稿一起重建，理由见 useWriterEditor。
  const editorDocumentId = activeId

  const handleDropCard = useCallback((card: MnCard, count: number) => {
    recordCardUseRef.current(card.id)
    const label = cardLabel(card)
    setToast(
      count > 1 ? `已插入「${label}」，正文共有 ${count} 处引用` : `已插入「${label}」`,
    )
  }, [])

  const handleEditorUpdate = useCallback((current: Editor) => {
    scheduleSaveRef.current(current.getJSON(), !current.isFocused)
    scheduleDerivedStateRef.current(current)
  }, [])

  const editor = useWriterEditor({
    extensions,
    content: activeDocument?.content ?? EMPTY_DOC,
    documentId: editorDocumentId,
    editable: Boolean(activeDocument),
    onDropCard: handleDropCard,
    onUpdate: handleEditorUpdate,
  })

  const {
    outline,
    insertedCounts,
    glossary,
    coverage,
    claims,
    syncDerivedState,
    scheduleDerivedState,
  } = useEditorDerivedState(editor)
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
      setLoadedRevision((value) => value + 1)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeId, editor, getDocument, syncDerivedState])

  /** 学习集里的卡片。 */
  const {
    cards: allCards,
    loading: loadingCards,
    refresh: refreshCards,
  } = useCardLibrary(adapter)

  /** 旧快照里的假标题按学习集里的真实标题补齐。 */
  useSnapshotSync({ editor, cards: allCards, revision: loadedRevision })

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

  /** 正文里已经插入的卡片不再作为证据提示。 */
  const insertedCardIds = useMemo(() => new Set(insertedCounts.keys()), [insertedCounts])

  /** 当前文稿里卡片的使用痕迹。 */
  const usage = useMemo(() => cardUsageMap(activeDocument), [activeDocument])

  /** 当前文稿里作者对检索结果的判断。 */
  const feedback = useMemo(() => cardFeedbackMap(activeDocument), [activeDocument])
  const usageCounts = useMemo(() => knowledgeCountMap(knowledge), [knowledge])

  /** 引用与学习集卡片的对应关系由插件维护，界面层从插件状态读取。 */
  useEffect(() => {
    setCitationCards(allCards)
    if (!editor) return
    editor.view.dispatch(editor.state.tr.setMeta(citationPluginKey, {}))
  }, [allCards, editor])

  const citationIndex = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return EMPTY_CITATION_INDEX
      return citationPluginKey.getState(current.state)?.index ?? EMPTY_CITATION_INDEX
    },
    equalityFn: (left, right) => left === right,
  })

  /** 写作当下浮现的相关卡片，以及证据条与助手共用的证据。 */
  const {
    context,
    hits: relatedHits,
    associations,
    evidence: evidenceHits,
    suggest,
  } = useWritingEvidence(editor, allCards, insertedCardIds, {
    feedback,
    usage: usageCounts,
    citationIndex,
  })

  const handleSelectCitation = useCallback(
    (entry: CitationEntry) => {
      if (!editor) return
      selectCitation(editor, entry)
    },
    [editor],
  )

  /** 缺少证据的断言索引，供大纲面板显示与定位。 */
  const claimIndex = useMemo(() => buildClaimIndex(claims), [claims])

  const handleFeedback = useCallback(
    (cardId: string, value: 1 | -1) => {
      setCardFeedback(cardId, nextFeedback(feedback.get(cardId), value))
    },
    [feedback, setCardFeedback],
  )

  useEffect(() => subscribeToast(setToast), [])

  useEffect(() => subscribeRelatedCards(setRelatedTarget), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const recordUse = useCallback((cardId: string) => {
    recordCardUseRef.current(cardId)
  }, [])

  const finishInsertion = useCallback(() => {
    setPickerOpen(false)
    if (isCompactLayout()) setSidebarOpen(false)
  }, [])

  const insertCard = useCardInsertion({
    editor,
    onToast: setToast,
    onRecordUse: recordUse,
    onSync: syncDerivedState,
    onInserted: finishInsertion,
  })

  /** 资料库检索与资料库材料的相关操作。 */
  const { library, onSearchLibrary, onFocusNote, onInsertNote, onOpenDocument } =
    useLibraryActions({ adapter, insertCard, onToast: setToast })

  useEffect(() => {
    // 斜杠菜单请求插入脚注时执行插入。
    if (footnoteRequest === 0) return
    insertFootnote()
  }, [footnoteRequest, insertFootnote])

  /** 刷新正文内全部卡片内容，同时重新读取侧栏卡片列表。 */
  const { refreshing, refreshAllCards } = useCardRefresh({
    editor,
    adapter,
    documentId: activeDocumentId,
    onRefreshed: refreshCards,
    onToast: setToast,
    syncDerivedState,
  })

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
      const target = claimIndex.targets.get(item.id)
      if (target === undefined) {
        jumpToOutline(editor, item)
      } else {
        jumpToPosition(editor, target)
      }
      if (isCompactLayout()) setSidebarOpen(false)
    },
    [editor, claimIndex.targets],
  )

  const { copyMarkdown, downloadMarkdown, downloadJson, importJson } = useDocumentExport({
    editor,
    title: activeDocument?.title ?? '',
    onToast: setToast,
    importDocument,
  })

  useWriterShortcuts({
    pickerOpen,
    focusMode,
    onOpenPicker: () => setPickerOpen(true),
    onToggleFocus: () => setFocusMode((value) => !value),
    onSave: () => {
      setToast(flushSave() ? '文稿已保存到本地' : '保存失败，请导出 JSON 备份')
    },
  })

  /** 在 MarginNote 的脑图里定位到指定卡片。 */
  const focusCard = useCardFocus(adapter, setToast)

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
            coverage={coverage}
            claimCounts={claimIndex.counts}
            claimTotal={claimIndex.total}
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
            context={context}
            relatedHits={relatedHits}
            associations={associations}
            citationIndex={citationIndex}
            cardUsage={usage}
            knowledge={knowledge}
            cardFeedback={feedback}
            glossary={glossary}
            library={library}
            suggest={suggest}
            onFocusCard={focusCard}
            onSearchLibrary={onSearchLibrary}
            onFocusNote={onFocusNote}
            onInsertNote={onInsertNote}
            onOpenDocument={onOpenDocument}
            onSelectCitation={handleSelectCitation}
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
            hasDocument={Boolean(activeDocument)}
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

      {editor && !focusMode && (
        <BubbleToolbar editor={editor} onAssist={(range) => setAssistRange(range)} />
      )}

      <AssistantPanel
        range={assistRange}
        editor={editor}
        hits={relatedHits}
        documentTitle={activeDocument?.title ?? ''}
        glossary={glossary}
        key={assistRange ? `${assistRange.from}-${assistRange.to}` : 'assistant'}
        onClose={() => setAssistRange(null)}
        onOpenSettings={() => setModelSettingsOpen(true)}
        onToast={setToast}
        onFocusCard={focusCard}
      />

      <ModelSettingsDialog
        open={modelSettingsOpen}
        onClose={() => setModelSettingsOpen(false)}
        onToast={setToast}
      />

      <ParagraphSurface
        editor={editor}
        hits={evidenceHits}
        usage={usage}
        knowledge={knowledge}
        documentId={activeDocumentId}
        feedback={feedback}
        onInsert={insertCard}
        onFocus={focusCard}
        onFeedback={handleFeedback}
        onSearchLibrary={onSearchLibrary}
      />

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

      <RelatedCardsDialog
        card={relatedTarget}
        cards={allCards}
        key={relatedTarget?.id ?? 'related-cards'}
        onClose={() => setRelatedTarget(null)}
        onInsert={insertCard}
        onFocus={focusCard}
      />

      <FootnoteDialog />

      {toast && <div className="toast">{toast}</div>}

      <ResizeGrip />
    </div>
  )
}
