/**
 * 资料库候选。
 *
 * 段落没有命中卡片时，这里列出资料库里可能用得上的材料。
 * 每条候选保留标题、所属学习集与命中片段，作者据此判断是否取用。
 */

import { BookOpen, ExternalLink, Plus } from 'lucide-react'
import type { LibrarySuggestState } from '../hooks/useLibrarySuggest'
import type { LibraryDocumentHit, LibraryNoteHit } from '../types'
import { EmptyState } from './EmptyState'

interface LibraryCandidatesProps {
  state: LibrarySuggestState
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

export function LibraryCandidates({
  state,
  onFocusNote,
  onInsertNote,
  onOpenDocument,
}: LibraryCandidatesProps) {
  if (state.status === 'loading') {
    return <EmptyState kind="loading">正在资料库里寻找可用材料…</EmptyState>
  }
  if (state.status === 'error') {
    return <EmptyState kind="failed">资料库检索失败。</EmptyState>
  }
  if (state.notes.length === 0 && state.documents.length === 0) {
    return <EmptyState kind="failed">资料库里没有与「{state.query}」相关的材料。</EmptyState>
  }

  return (
    <div className="library-results">
      <p className="library-query">按段落里的「{state.query}」检索</p>
      <ul className="library-list">
        {state.notes.map((note) => (
          <li className="library-row" key={note.id}>
            <div className="library-row-main">
              <span className="library-row-title">{note.title || shortSnippet(note.snippet)}</span>
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
        {state.documents.map((item) => (
          <li className="library-row" key={item.id}>
            <div className="library-row-main">
              <span className="library-row-title">{item.title}</span>
            </div>
            <div className="library-row-actions">
              <button
                type="button"
                className="mn-icon-button"
                onClick={() => onOpenDocument(item)}
                title="在 MarginNote 中打开"
                aria-label={'在 MarginNote 中打开：' + item.title}
              >
                <BookOpen size={13} strokeWidth={1.8} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
