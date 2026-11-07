import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { FootnoteReferenceView } from '../components/FootnoteReferenceView'

/**
 * 脚注引用。
 *
 * 引用内联在正文中，同时携带脚注正文。
 * 脚注正文存在引用节点里，导出 Markdown 与 JSON 时都不会丢失。
 */
export const FootnoteReference = Node.create({
  name: 'footnoteReference',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      content: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-footnote-content') ?? '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-footnote-content': String(attributes.content ?? ''),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-footnote-content]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'mn-footnote-ref',
        'data-footnote-content': String(node.attrs.content ?? ''),
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FootnoteReferenceView)
  },
})
