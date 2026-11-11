/**
 * 写作上下文订阅。
 *
 * 上下文随选区与正文变化更新，内容未变时保持原有对象，避免多余渲染。
 */

import type { Editor } from '@tiptap/core'
import { useEffect, useRef, useState } from 'react'
import { readWritingContext, type WritingContext } from '../lib/context'

function sameContext(left: WritingContext | null, right: WritingContext | null): boolean {
  if (left === right) return true
  if (!left || !right) return false
  return (
    left.paragraph === right.paragraph &&
    left.heading === right.heading &&
    left.previous === right.previous
  )
}

export function useWritingContext(editor: Editor | null): WritingContext | null {
  const [context, setContext] = useState<WritingContext | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!editor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContext(null)
      return
    }
    const update = () => {
      const next = readWritingContext(editor)
      setContext((current) => (sameContext(current, next) ? current : next))
    }
    // 输入过程中不做检索，等停笔后再更新，避免每次击键都重算相关度。
    const schedule = () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        timer.current = null
        update()
      }, 180)
    }
    update()
    editor.on('selectionUpdate', schedule)
    editor.on('update', schedule)
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = null
      editor.off('selectionUpdate', schedule)
      editor.off('update', schedule)
    }
  }, [editor])

  return context
}
