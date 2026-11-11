/**
 * 段落末尾浮层。
 *
 * 浮层的位置由编辑器给出的容器决定，内容由 React 决定。
 * 引用出处展开时显示出处卡片，其余时候显示证据条，两者不同时出现。
 */

import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { citationPluginKey } from '../editor/citationPlugin'
import { getParagraphSlot, subscribeParagraphSlot } from '../editor/paragraphSlot'
import type { CardFeedbackValue } from '../lib/cardFeedback'
import type { CitationEntry } from '../lib/citationIndex'
import type { KnowledgeStore } from '../lib/knowledge'
import type { RelevanceHit } from '../lib/relevance'
import type { MnCard } from '../types'
import { CitationSource } from './CitationSource'
import { EvidenceStrip } from './EvidenceStrip'

interface ParagraphSurfaceProps {
  editor: Editor | null
  hits: RelevanceHit[]
  usage: Map<string, number>
  knowledge: KnowledgeStore
  documentId: string
  feedback: Map<string, CardFeedbackValue>
  onInsert: (card: MnCard) => void
  onFocus: (card: MnCard) => void
  onFeedback: (cardId: string, value: CardFeedbackValue) => void
  onSearchLibrary: (query: string) => void
}

export function ParagraphSurface({
  editor,
  hits,
  usage,
  knowledge,
  documentId,
  feedback,
  onInsert,
  onFocus,
  onFeedback,
  onSearchLibrary,
}: ParagraphSurfaceProps) {
  const slot = useSyncExternalStore(subscribeParagraphSlot, getParagraphSlot, getParagraphSlot)
  const entry = useEditorState({
    editor,
    selector: ({ editor: current }): CitationEntry | null => {
      if (!current) return null
      const state = citationPluginKey.getState(current.state)
      const id = state?.selected
      if (!id) return null
      return state?.index.entries.find((item) => item.id === id) ?? null
    },
    equalityFn: (left, right) => left === right,
  })
  const showCitation = entry !== null
  const showEvidence = !showCitation && hits.length > 0

  useEffect(() => {
    const element = getParagraphSlot()
    if (!element) return
    element.dataset.state = showCitation || showEvidence ? 'ready' : 'empty'
  }, [slot, showCitation, showEvidence])

  if (!slot) return null
  if (showCitation && entry) {
    return createPortal(
      <CitationSource
        entry={entry}
        onInsert={onInsert}
        onFocus={onFocus}
        onSearchLibrary={onSearchLibrary}
      />,
      slot,
    )
  }
  if (showEvidence) {
    return createPortal(
      <EvidenceStrip
        hits={hits}
        usage={usage}
        knowledge={knowledge}
        documentId={documentId}
        feedback={feedback}
        onInsert={onInsert}
        onFocus={onFocus}
        onFeedback={onFeedback}
      />,
      slot,
    )
  }
  return null
}
