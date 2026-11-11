/**
 * 相关面板。
 *
 * 面板回答三个问题：此刻在写什么、哪些卡片与此刻相关、哪些引用还没有来源。
 */

import { CircleDot, ExternalLink, Plus, Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useScrollFade } from '../hooks/useScrollFade'
import type { LibrarySuggestState } from '../hooks/useLibrarySuggest'

import type { LibrarySearchState } from '../hooks/useLibrarySearch'
import type { AssociationHit } from '../lib/associations'
import { cardSummary, sameText } from '../lib/cardSummary'
import type { CardFeedbackValue } from '../lib/cardFeedback'
import { sectionAt, type CitationEntry, type CitationIndex } from '../lib/citationIndex'
import type { WritingContext } from '../lib/context'
import type { GlossaryTerm } from '../lib/glossary'
import { resolveUsageHint, type KnowledgeStore } from '../lib/knowledge'
import type { RelevanceHit } from '../lib/relevance'
import { pickSearchQuery } from '../lib/searchQuery'
import type { LibraryDocumentHit, LibraryNoteHit, MnCard } from '../types'
import { AssociationList } from './AssociationList'
import { CardHeading } from './CardHeading'
import { CitationList } from './CitationList'
import { EmptyState } from './EmptyState'
import { HighlightedText } from './HighlightedText'
import { LibraryResults } from './LibraryResults'
import { LibraryCandidates } from './LibraryCandidates'

interface RelatedPanelProps {
  context: WritingContext | null
  hits: RelevanceHit[]
  associations: AssociationHit[]
  citationIndex: CitationIndex
  usage: Map<string, number>
  knowledge: KnowledgeStore
  documentId: string
  feedback: Map<string, CardFeedbackValue>
  glossary: GlossaryTerm[]
  library: LibrarySearchState
  suggest: LibrarySuggestState
  onInsert: (card: MnCard) => void
  onFocus: (card: MnCard) => void
  onSearchLibrary: (query: string) => void
  onFocusNote: (note: LibraryNoteHit) => void
  onInsertNote: (note: LibraryNoteHit) => void
  onOpenDocument: (document: LibraryDocumentHit) => void
  onSelectCitation: (entry: CitationEntry) => void
}

const PASSAGE_LIMIT = 96

function shortPassage(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= PASSAGE_LIMIT) return trimmed
  return trimmed.slice(0, PASSAGE_LIMIT) + '…'
}

function contextHeading(context: WritingContext | null): string {
  if (!context) return '未选中正文'
  if (context.heading) return context.heading
  return '正文开头'
}

export function RelatedPanel({
  context,
  hits,
  associations,
  citationIndex,
  usage,
  knowledge,
  documentId,
  feedback,
  glossary,
  library,
  suggest,
  onInsert,
  onFocus,
  onSearchLibrary,
  onFocusNote,
  onInsertNote,
  onOpenDocument,
  onSelectCitation,
}: RelatedPanelProps) {
  const paragraph = context?.paragraph ?? ''
  const searchQuery = pickSearchQuery(hits, context, glossary)
  /** 光标所在节的引用。 */
  const section = context ? sectionAt(citationIndex.sections, context.pos) : null
  /** 本节里缺少来源的引用数量。 */
  const missingCount = section
    ? section.entries.filter((entry) => entry.cards.length === 0).length
    : 0
  /** 资料库材料块，检索结束后滚动到视野。 */
  const libraryRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (library.status !== 'done') return
    libraryRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [library.status, library.query])
  const { scrollerRef, fadeTop, fadeBottom } = useScrollFade<HTMLDivElement>()
  return (
    <div className="sidebar-panel related-panel">
      <div className="related-scroll" ref={scrollerRef}>
        <section className="related-block">
          <h3 className="related-title">当前上下文</h3>
          <p className="related-heading">
            <CircleDot size={11} strokeWidth={2.4} />
            {contextHeading(context)}
          </p>
          {paragraph && <p className="related-paragraph">{shortPassage(paragraph)}</p>}
        </section>

        <section className="related-block">
          <h3 className="related-title">
            相关卡片
            {hits.length > 0 && <span className="related-count">{hits.length}</span>}
          </h3>
          {hits.length === 0 ? (
            <EmptyState>暂无相关卡片</EmptyState>
          ) : (
            <div className="related-list">
              {hits.map((hit) => {
                const summary = cardSummary(hit.card)
                const hint = resolveUsageHint(hit.card.id, knowledge, usage, documentId)
                const mark = feedback.get(hit.card.id)
                return (
                  <article
                    className="related-card"
                    key={hit.card.id}
                    data-kind={hit.card.kind}
                    data-mark={mark === 1 ? 'useful' : mark === -1 ? 'useless' : 'none'}
                  >
                    <span className="related-card-accent" />
                    <div className="related-card-main">
                      <CardHeading summary={summary} className="related-card-title" />
                      {hit.passage && !sameText(hit.passage, summary.title) && (
                        <span className="related-card-passage">
                          <HighlightedText text={shortPassage(hit.passage)} terms={hit.terms} />
                        </span>
                      )}
                      <span className="related-card-meta">
                        {summary.source && (
                          <span className="related-card-source">{summary.source}</span>
                        )}
                        <span className="related-card-tags">
                          {hit.card.citationKey && (
                            <span className="related-card-key">@{hit.card.citationKey}</span>
                          )}
                          {hit.cited && <span className="related-card-cited">引用来源</span>}
                          {hit.via && (
                            <span
                              className="related-card-via"
                              title={`与当前段落的「${hit.via.bridge}」共同出现`}
                            >
                              经由「{hit.via.term}」
                            </span>
                          )}
                          {hint && (
                            <span
                              className={hint.stale ? 'related-card-stale' : 'related-card-used'}
                            >
                              {hint.text}
                            </span>
                          )}
                          {mark === 1 && <span className="related-card-mark">有用</span>}
                          {mark === -1 && <span className="related-card-mark">没用</span>}
                        </span>
                      </span>
                    </div>
                    <div className="related-card-actions">
                      <button
                        type="button"
                        className="mn-icon-button"
                        onClick={() => onFocus(hit.card)}
                        title="在 MarginNote 中定位"
                        aria-label={'在 MarginNote 中定位：' + summary.identifier}
                      >
                        <ExternalLink size={13} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        className="mn-icon-button related-insert"
                        onClick={() => onInsert(hit.card)}
                        title="插入到正文"
                        aria-label={'插入到正文：' + summary.identifier}
                      >
                        <Plus size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {library.status === 'idle' &&
          (suggest.status === 'loading' ||
            (suggest.status === 'done' && suggest.notes.length + suggest.documents.length > 0)) && (
          <section className="related-block">
            <h3 className="related-title">
              资料库候选
              {suggest.status === 'done' && (
                <span className="related-count">
                  {suggest.notes.length + suggest.documents.length}
                </span>
              )}
            </h3>
            <LibraryCandidates
              state={suggest}
              onFocusNote={onFocusNote}
              onInsertNote={onInsertNote}
              onOpenDocument={onOpenDocument}
            />
          </section>
        )}

        {associations.length > 0 && (
          <section className="related-block related-associations">
            <h3 className="related-title">
              联想
              <span className="related-count">{associations.length}</span>
            </h3>
            <AssociationList
              associations={associations}
              onInsert={onInsert}
              onFocus={onFocus}
            />
          </section>
        )}

        <section className="related-block">
          <h3 className="related-title">
            引用出处
            {section && section.entries.length > 0 && (
              <>
                <span className="related-count">{section.entries.length}</span>
                {missingCount > 0 && (
                  <span className="related-count-missing">缺 {missingCount}</span>
                )}
              </>
            )}
          </h3>
          <CitationList
            section={section}
            active={context !== null}
            onSelect={onSelectCitation}
            onSearchLibrary={onSearchLibrary}
          />
        </section>

        <section className="related-block" ref={libraryRef}>
          <h3 className="related-title">
            资料库材料
            <button
              type="button"
              className="related-search-button"
              onClick={() => onSearchLibrary(searchQuery)}
              disabled={!searchQuery}
              title={searchQuery ? `按「${searchQuery}」检索资料库` : '当前段落没有可用的检索词'}
            >
              <Search size={12} strokeWidth={2} />
              查找资料库
            </button>
          </h3>
          <LibraryResults
            state={library}
            onFocusNote={onFocusNote}
            onInsertNote={onInsertNote}
            onOpenDocument={onOpenDocument}
          />
        </section>
      </div>
      <span className={'related-fade is-top' + (fadeTop ? ' is-visible' : '')} />
      <span className={'related-fade is-bottom' + (fadeBottom ? ' is-visible' : '')} />
    </div>
  )
}
