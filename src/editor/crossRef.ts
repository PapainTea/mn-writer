import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CrossRefView } from '../components/CrossRefView'

/**
 * 交叉引用。
 *
 * 引用指向文稿里的标题、表格或图表，保存目标标识与显示文字。
 * 目标被删除后，引用按失效样式呈现，不影响正文排版。
 */
export const CrossReference = Node.create({
  name: 'crossReference',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      targetId: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-target-id') ?? '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-target-id': String(attributes.targetId ?? ''),
        }),
      },
      kind: {
        default: 'heading',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-target-kind') ?? 'heading',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-target-kind': String(attributes.kind ?? 'heading'),
        }),
      },
      label: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-target-label') ?? '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-target-label': String(attributes.label ?? ''),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-target-id]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'mn-cross-ref',
        'data-target-id': String(node.attrs.targetId ?? ''),
        'data-target-kind': String(node.attrs.kind ?? 'heading'),
        'data-target-label': String(node.attrs.label ?? ''),
      }),
      String(node.attrs.label ?? ''),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CrossRefView)
  },
})
