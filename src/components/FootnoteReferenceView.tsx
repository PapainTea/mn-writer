import type { NodeViewProps } from '@tiptap/react'
import { useEffect, useState } from 'react'
import { openFootnoteEditor } from '../editor/footnoteEditor'
import { InlineNodeView } from './InlineNodeView'

/**
 * 读取脚注在正文中的序号。
 *
 * 节点视图替换了正文 DOM，装饰无法作用到内部元素，
 * 因此这里按位置遍历文档，计算该脚注前面有多少个脚注。
 */
function footnoteNumber(editor: NodeViewProps['editor'], pos: number): number {
  let count = 0
  editor.state.doc.descendants((node, nodePos) => {
    if (node.type.name !== 'footnoteReference') return
    if (nodePos <= pos) count += 1
  })
  return count
}

/**
 * 脚注引用。
 *
 * 正文里显示编号，点击后在面板底部编辑脚注正文。
 */
export function FootnoteReferenceView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const content = String(node.attrs.content ?? '')

  const pos = getPos()
  const number = typeof pos === 'number' ? footnoteNumber(editor, pos) : 1

  // 脚注增删后重新计算编号。
  const [, setRevision] = useState(0)
  useEffect(() => {
    const onTransaction = ({
      transaction,
    }: {
      transaction: { steps: Array<{ toJSON: () => unknown }> }
    }) => {
      const touchesFootnote = transaction.steps.some((step) =>
        JSON.stringify(step.toJSON()).includes('footnoteReference'),
      )
      if (touchesFootnote) setRevision((value) => value + 1)
    }
    editor.on('transaction', onTransaction)
    return () => {
      editor.off('transaction', onTransaction)
    }
  }, [editor])

  return (
    <InlineNodeView className="mn-footnote-anchor">
      <button
        type="button"
        className="mn-footnote-ref"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() =>
          openFootnoteEditor({
            number,
            content,
            apply: (value) => updateAttributes({ content: value }),
            remove: () => {
              const current = getPos()
              if (typeof current !== 'number') return
              editor.chain().focus().deleteRange({ from: current, to: current + 1 }).run()
            },
          })
        }
        title={content || '添加脚注'}
        aria-label={content ? `脚注：${content}` : '添加脚注'}
      >
        <sup className="mn-footnote-number">{number}</sup>
      </button>
    </InlineNodeView>
  )
}
