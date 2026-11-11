/**
 * 资料库检索结果。
 *
 * 结果分成卡片命中与文献命中两组。
 * 卡片可以定位到 MarginNote，也可以插入正文；
 * 文献可以打开到 MarginNote 的对应文档。
 */

import { BookOpen, ExternalLink, Plus } from 'lucide-react'
import type { LibrarySearchState } from '../hooks/useLibrarySearch'
import type { LibraryDocumentHit, LibraryNoteHit } from '../types'
import { EmptyState } from './EmptyState'

interface LibraryResultsProps {
  state: LibrarySearchState
  onFocusNote: (note: LibraryNoteHit) => void
  onInsertNote: (note: LibraryNoteHit) => void
  onOpenDocument: (document: LibraryDocumentHit) => void
}

const SNIPPET_LIMIT = 72

function shortSnippet(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= SNIPPET_LIMIT) return trimmed
  return trimmed.slice(0, SNIPPET_LIMIT) + '…'
}

export function LibraryResults({
  state,
  onFocusNote,
  onInsertNote,
  onOpenDocument,
}: LibraryResultsProps) {
  if (state.status === 'idle') return null
  if (state.status === 'loading') {
    return <EmptyState kind="loading">正在检索资料库…</EmptyState>
  }
  if (state.status === 'error') {
    return <EmptyState kind="failed">检索失败，请重新查找。</EmptyState>
  }

  const notes = state.result?.notes ?? []
  const documents = state.result?.documents ?? []
  if (notes.length === 0 && documents.length === 0) {
    return <EmptyState kind="failed">资料库里没有匹配「{state.query}」的材料。</EmptyState>
  }

  return (
    <div className="library-results">
      <p className="library-query">检索词「{state.query}」</p>

      {notes.length > 0 && (
        <section className="library-group">
          <h4 className="library-group-title">卡片命中</h4>
          <ul className="library-list">
            {notes.map((note) => (
              <li className="library-row" key={note.id}>
                <div className="library-row-main">
                  <span className="library-row-title">
                    {note.title || shortSnippet(note.snippet)}
                  </span>
                  <span className="library-row-meta">
                    {note.topicTitle && <span>{note.topicTitle}</span>}
                    {note.title && note.snippet && <span>{shortSnippet(note.snippet)}</span>}
                  </span>
                </div>
                <div className="library-row-actions">
                  <button
                    type="button"
                    className="mn-icon-button"
                    onClick={() => onFocusNote(note)}
                    title="在 MarginNote 中定位"
                    aria-label={'在 MarginNote 中定位：' + (note.title || note.snippet)}
                  >
                    <ExternalLink size={13} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    className="mn-icon-button library-insert"
                    onClick={() => onInsertNote(note)}
                    title="插入到正文"
                    aria-label={'插入到正文：' + (note.title || note.snippet)}
                  >
                    <Plus size={13} strokeWidth={2} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {documents.length > 0 && (
        <section className="library-group">
          <h4 className="library-group-title">文献命中</h4>
          <ul className="library-list">
            {documents.map((item) => (
              <li className="library-row" key={item.id}>
                <div className="library-row-main">
                  <span className="library-row-title">{item.title}</span>
                </div>
                <button
                  type="button"
                  className="mn-icon-button"
                  onClick={() => onOpenDocument(item)}
                  title="在 MarginNote 中打开"
                  aria-label={'在 MarginNote 中打开：' + item.title}
                >
                  <BookOpen size={13} strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
