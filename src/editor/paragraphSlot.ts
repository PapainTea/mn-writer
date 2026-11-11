/**
 * 段落末尾浮层插槽。
 *
 * 编辑器里的浮层是一个空容器，实际内容由 React 渲染后传送到容器内。
 * 容器位置由 ProseMirror 装饰件决定，内容由 React 决定，两者互不干扰。
 * 证据条与引用出处共用这个插槽，同一时刻只显示其中一处。
 */

let slot: HTMLElement | null = null
const listeners = new Set<() => void>()

export function setParagraphSlot(element: HTMLElement | null): void {
  if (slot === element) return
  slot = element
  for (const listener of listeners) listener()
}

export function getParagraphSlot(): HTMLElement | null {
  return slot
}

export function subscribeParagraphSlot(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
