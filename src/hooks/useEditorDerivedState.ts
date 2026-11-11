import type { Editor } from '@tiptap/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { collectClaims, type ClaimReport } from '../lib/claims'
import { collectCoverage } from '../lib/coverage'
import { extractGlossary, type GlossaryTerm } from '../lib/glossary'
import { countInsertedCards } from '../lib/inserted'
import { collectManuscriptText } from '../lib/manuscriptText'
import { collectOutline } from '../lib/outline'
import type { OutlineItem } from '../types'

export function useEditorDerivedState(editor: Editor | null) {
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [insertedCounts, setInsertedCounts] = useState<Map<string, number>>(new Map())
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([])
  const [coverage, setCoverage] = useState<Map<string, number>>(new Map())
  const [claims, setClaims] = useState<ClaimReport>({ sections: new Map(), missingCount: 0 })
  const timer = useRef<number | null>(null)

  const syncDerivedState = useCallback((current: Editor) => {
    setOutline(collectOutline(current))
    setInsertedCounts(countInsertedCards(current.getJSON()))
    setGlossary(extractGlossary(collectManuscriptText(current.getJSON())))
    setCoverage(collectCoverage(current))
    setClaims(collectClaims(current))
  }, [])

  const scheduleDerivedState = useCallback(
    (current: Editor) => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        timer.current = null
        syncDerivedState(current)
      }, 180)
    },
    [syncDerivedState],
  )

  useEffect(() => {
    if (!editor) return
    const initial = window.setTimeout(() => syncDerivedState(editor), 0)
    return () => {
      window.clearTimeout(initial)
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [editor, syncDerivedState])

  return { outline, insertedCounts, glossary, coverage, claims, syncDerivedState, scheduleDerivedState }
}
