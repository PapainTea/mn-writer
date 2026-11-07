/**
 * 布局断点。
 *
 * 面板宽度达到该值时，侧栏固定在左侧；低于该值时，侧栏以浮层形式出现。
 * MarginNote 场景窗口会压缩面板宽度，断点取值不宜过高。
 */
export const COMPACT_WIDTH = 720

export function isCompactLayout(): boolean {
  return window.innerWidth < COMPACT_WIDTH
}

export function watchCompactLayout(handler: (compact: boolean) => void): () => void {
  const media = window.matchMedia(`(max-width: ${COMPACT_WIDTH - 1}px)`)
  const listener = (event: MediaQueryListEvent) => handler(event.matches)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}
