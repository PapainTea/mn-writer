import { useEffect, useRef, useState } from 'react'
import { getAdapter } from '../mn'
import { onNativeSelection } from '../mn/native'

/**
 * 轮询 MarginNote 的界面状态，跟踪当前聚焦的卡片。
 *
 * 官方事件清单没有卡片选中事件，混合形态插件可以读取原生选区，
 * 面板形态只能依靠界面状态轮询。轮询在同时满足以下条件时暂停：
 * 页面不可见、专注模式开启。同一时间只允许一个请求在途。
 */
export function useSelectedCardId(enabled: boolean): string | null {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const inFlight = useRef(false)
  const sequence = useRef(0)

  useEffect(() => {
    if (!enabled) return

    let disposed = false

    const apply = (id: string | null) => {
      if (disposed) return
      setSelectedId((previous) => (previous === id ? previous : id))
    }

    const read = async () => {
      if (disposed) return
      if (document.hidden) return
      if (inFlight.current) return

      inFlight.current = true
      const ticket = sequence.current + 1
      sequence.current = ticket
      try {
        const id = await getAdapter().getSelectedCardId()
        if (disposed || ticket !== sequence.current) return
        apply(id)
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
      apply(noteIds[0] ?? null)
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

  return selectedId
}
