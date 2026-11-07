import type { NodeViewProps } from '@tiptap/react'
import { showToast } from '../lib/toast'
import { InlineNodeView } from './InlineNodeView'

const KIND_LABEL: Record<string, string> = {
  heading: '标题',
  table: '表格',
}

/**
 * 交叉引用。
 *
 * 正文里显示引用文字，点击后滚动到目标位置。
 * 目标被删除后给出提示，不改变引用文字。
 */
export function CrossRefView({ node, editor }: NodeViewProps) {
  const label = String(node.attrs.label ?? '')
  const kind = String(node.attrs.kind ?? 'heading')
  const targetId = String(node.attrs.targetId ?? '')

  const jump = () => {
    let headingNumber = 0
    let tableNumber = 0
    let target: number | null = null
    editor.state.doc.descendants((child, pos) => {
      if (target !== null) return false
      if (child.type.name === 'heading') {
        const text = child.textContent.trim()
        if (!text) return true
        headingNumber += 1
        if (`heading-${headingNumber}-${text}` === targetId) target = pos
      }
      if (child.type.name === 'table') {
        tableNumber += 1
        if (`table-${tableNumber}` === targetId) target = pos
      }
      return true
    })

    if (target === null) {
      showToast('引用的目标已不存在')
      return
    }
    const dom = editor.view.nodeDOM(target)
    if (dom instanceof HTMLElement) {
      dom.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }

  return (
    <InlineNodeView className="mn-cross-ref-anchor">
      <button
        type="button"
        className="mn-cross-ref"
        data-kind={kind}
        title={`引用${KIND_LABEL[kind] ?? '内容'}，点击跳转`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={jump}
      >
        {label}
      </button>
    </InlineNodeView>
  )
}
