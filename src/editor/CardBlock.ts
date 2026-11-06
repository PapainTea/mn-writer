import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { MnCard } from '../types'
import { CardNodeView } from './CardNodeView'

export interface CardBlockAttrs {
  cardId: string
  snapshot: MnCard | null
}

export const CardBlock = Node.create({
  name: 'cardBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      cardId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-card-id'),
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-card-id': attributes.cardId ?? '',
        }),
      },
      snapshot: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-card')
          if (!raw) return null
          try {
            return JSON.parse(raw) as MnCard
          } catch {
            return null
          }
        },
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-card': attributes.snapshot ? JSON.stringify(attributes.snapshot) : '',
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-card-id]' }]
  },

  renderHTML({ node }) {
    const card = node.attrs.snapshot as MnCard | null
    return [
      'div',
      {
        'data-card-id': node.attrs.cardId ?? '',
        'data-card': card ? JSON.stringify(card) : '',
        class: 'mn-card-static',
      },
      card?.title ?? 'MarginNote 卡片',
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardNodeView)
  },
})
