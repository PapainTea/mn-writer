import { useEffect } from 'react'
import {
  applyPanelSize,
  clampPanelSize,
  currentPanelSize,
  readStoredPanelSize,
  refreshPanelSafeSize,
} from '../lib/panelSize'

/**
 * 面板加载完成后恢复上次的尺寸。
 * 场景顶栏与窗口尺寸会随宿主变化，因此尺寸上限每次都要重新读取，
 * 窗口变小后同步收紧当前尺寸，避免面板压到顶栏。
 */
export function usePanelSizeRestore(): void {
  useEffect(() => {
    const restore = () => {
      void refreshPanelSafeSize().then(() => {
        const stored = readStoredPanelSize()
        if (stored) applyPanelSize(stored)
      })
    }
    window.addEventListener('load', restore, { once: true })
    const timer = window.setTimeout(restore, 600)

    let resizeTimer = 0
    const handleResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        void refreshPanelSafeSize().then(() => {
          const current = currentPanelSize()
          const clamped = clampPanelSize(current)
          if (clamped.width !== current.width || clamped.height !== current.height) {
            applyPanelSize(clamped)
          }
        })
      }, 320)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('load', restore)
      window.removeEventListener('resize', handleResize)
      window.clearTimeout(resizeTimer)
      window.clearTimeout(timer)
    }
  }, [])
}
