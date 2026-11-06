import type { Editor } from '@tiptap/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { countInsertedCards } from '../lib/inserted'
import { collectOutline } from '../lib/outline'
import type { OutlineItem } from '../types'

export function useEditorDerivedState(editor: Editor | null) {
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [insertedCounts, setInsertedCounts] = useState<Map<string, number>>(new Map())
  const timer = useRef<number | null>(null)

  const syncDerivedState = useCallback((current: Editor) => {
    setOutline(collectOutline(current))
    setInsertedCounts(countInsertedCards(current.getJSON()))
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

  return { outline, insertedCounts, syncDerivedState, scheduleDerivedState }
}
