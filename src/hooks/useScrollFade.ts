/**
 * 滚动渐变。
 *
 * 容器可以上下滚动时，上边缘与下边缘出现渐变，提示还有内容。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { scrollFadeState } from '../lib/scrollFade'

export interface ScrollFade<T extends HTMLElement = HTMLElement> {
  /** 滚动容器的引用。 */
  scrollerRef: React.RefObject<T | null>
  /** 上方还有内容。 */
  fadeTop: boolean
  /** 下方还有内容。 */
  fadeBottom: boolean
}

export function useScrollFade<T extends HTMLElement = HTMLElement>(): ScrollFade<T> {
  const scrollerRef = useRef<T | null>(null)
  const [state, setState] = useState({ top: false, bottom: false })

  const sync = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const next = scrollFadeState(scroller)
    setState((current) =>
      current.top === next.top && current.bottom === next.bottom ? current : next,
    )
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    sync()
    scroller.addEventListener('scroll', sync, { passive: true })
    // 内容变高以后，滚动范围随之变化，渐变状态需要重新计算。
    const observer = new ResizeObserver(sync)
    observer.observe(scroller)
    for (const child of Array.from(scroller.children)) observer.observe(child)
    return () => {
      scroller.removeEventListener('scroll', sync)
      observer.disconnect()
    }
  }, [sync])

  return {
    scrollerRef,
    fadeTop: state.top,
    fadeBottom: state.bottom,
  }
}
