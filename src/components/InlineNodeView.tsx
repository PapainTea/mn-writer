import { useReactNodeView } from '@tiptap/react'
import type { DragEventHandler, ReactNode } from 'react'

interface InlineNodeViewProps {
  className?: string
  children: ReactNode
}

/**
 * 内联节点的容器。
 *
 * Tiptap 自带的容器组件会把 `as` 属性写进 DOM，
 * 这里直接输出 span，既保持内联排版，也不产生多余属性。
 */
export function InlineNodeView({ className, children }: InlineNodeViewProps) {
  const { onDragStart } = useReactNodeView()
  return (
    <span
      className={className}
      data-node-view-wrapper=""
      onDragStart={onDragStart as unknown as DragEventHandler<HTMLSpanElement>}
    >
      {children}
    </span>
  )
}
