import { useEffect, useRef, useState } from 'react'
import { getAdapter } from '../mn'
import { onNativeSelection } from '../mn/native'

/**
 * 跟踪 MarginNote 中当前选中的卡片。
 *
 * 混合形态插件读取原生选区并接收 `SelectionChanged` 通知；
 * 面板形态退回到界面状态读取。页面不可见或专注模式开启时暂停。
 */
export function useSelectedCardIds(enabled: boolean): string[] {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const inFlight = useRef(false)
  const sequence = useRef(0)

  useEffect(() => {
    if (!enabled) return

    let disposed = false

    const apply = (ids: string[]) => {
      if (disposed) return
      setSelectedIds((previous) => {
        if (previous.length === ids.length && previous.every((id, index) => id === ids[index])) {
          return previous
        }
        return ids
      })
    }

    const read = async () => {
      if (disposed) return
      if (document.hidden) return
      if (inFlight.current) return

      inFlight.current = true
      const ticket = sequence.current + 1
      sequence.current = ticket
      try {
        const ids = await getAdapter().getSelectedCardIds()
        if (disposed || ticket !== sequence.current) return
        apply(ids)
      } catch {
        // 读取失败时保留上一次的选中卡片，等待下一次事件或聚焦。
      } finally {
        inFlight.current = false
      }
    }

    const onVisibilityChange = () => {
      if (!document.hidden) void read()
    }

    const unsubscribe = onNativeSelection((noteIds) => {
      apply(noteIds)
    })
    window.addEventListener('focus', read)
    document.addEventListener('visibilitychange', onVisibilityChange)
    void read()

    return () => {
      disposed = true
      sequence.current += 1
      unsubscribe()
      window.removeEventListener('focus', read)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled])

  return selectedIds
}
