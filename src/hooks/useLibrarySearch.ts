/**
 * 资料库检索。
 *
 * 检索由作者手动触发，结果不会自动刷新，写作过程因此保持连续。
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { getAdapter } from '../mn'
import type { LibrarySearchResult } from '../types'

export type LibrarySearchStatus = 'idle' | 'loading' | 'done' | 'error'

export interface LibrarySearchState {
  status: LibrarySearchStatus
  query: string
  result: LibrarySearchResult | null
}

const INITIAL_STATE: LibrarySearchState = { status: 'idle', query: '', result: null }

export function useLibrarySearch() {
  const adapter = useMemo(() => getAdapter(), [])
  const [state, setState] = useState<LibrarySearchState>(INITIAL_STATE)
  const sequence = useRef(0)

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) return
      const current = sequence.current + 1
      sequence.current = current
      setState({ status: 'loading', query: trimmed, result: null })
      try {
        const result = await adapter.searchLibrary(trimmed)
        if (sequence.current !== current) return
        setState({ status: 'done', query: trimmed, result })
      } catch {
        if (sequence.current !== current) return
        setState({ status: 'error', query: trimmed, result: null })
      }
    },
    [adapter],
  )

  const reset = useCallback(() => {
    sequence.current += 1
    setState(INITIAL_STATE)
  }, [])

  return { ...state, search, reset }
}
