import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import {
  applyPanelSize,
  clampPanelSize,
  currentPanelSize,
  markCustomPanelSize,
  nextPanelSize,
  storePanelSize,
  type PanelSize,
} from '../lib/panelSize'

interface DragState {
  pointerId: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  moved: boolean
}

const KEYBOARD_STEP = 40
const LIVE_APPLY_INTERVAL = 60
const DRAG_THRESHOLD = 4

export function ResizeGrip() {
  const dragRef = useRef<DragState | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingRef = useRef<PanelSize | null>(null)
  const lastApplyRef = useRef(0)

  const flush = useCallback(() => {
    frameRef.current = null
    const target = pendingRef.current
    if (!target) return
    const now = performance.now()
    if (now - lastApplyRef.current < LIVE_APPLY_INTERVAL) return
    lastApplyRef.current = now
    applyPanelSize(target)
  }, [])

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const schedule = useCallback(
    (target: PanelSize) => {
      pendingRef.current = target
      if (frameRef.current !== null) return
      frameRef.current = requestAnimationFrame(flush)
    },
    [flush],
  )

  const cyclePreset = useCallback(() => {
    const next = nextPanelSize()
    applyPanelSize(next)
    storePanelSize(next)
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const size = currentPanelSize()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: size.width,
      startHeight: size.height,
      moved: false,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return
    drag.moved = true
    const next = clampPanelSize({
      width: drag.startWidth + deltaX,
      height: drag.startHeight + deltaY,
    })
    schedule(next)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    if (drag?.moved) {
      const next = clampPanelSize({
        width: drag.startWidth + (event.clientX - drag.startX),
        height: drag.startHeight + (event.clientY - drag.startY),
      })
      applyPanelSize(next)
      storePanelSize(next)
      markCustomPanelSize()
    } else if (drag) {
      cyclePreset()
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEYBOARD_STEP * 2 : KEYBOARD_STEP
    const current = currentPanelSize()
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      cyclePreset()
      return
    }
    let next: PanelSize | null = null
    if (event.key === 'ArrowRight') next = { width: current.width + step, height: current.height }
    if (event.key === 'ArrowLeft') next = { width: current.width - step, height: current.height }
    if (event.key === 'ArrowDown') next = { width: current.width, height: current.height + step }
    if (event.key === 'ArrowUp') next = { width: current.width, height: current.height - step }
    if (!next) return
    event.preventDefault()
    const target = clampPanelSize(next)
    applyPanelSize(target)
    storePanelSize(target)
    markCustomPanelSize()
  }

  return (
    <div
        className="resize-grip"
        role="button"
        tabIndex={0}
        aria-label="调整面板大小"
        title="拖动调整大小，轻按切换预设尺寸"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    />
  )
}
