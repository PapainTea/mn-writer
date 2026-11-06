import type { Editor, JSONContent } from '@tiptap/core'
import type { MnCard } from '../types'

function cardContent(card: MnCard): JSONContent[] {
  return [
    {
      type: 'cardBlock',
      attrs: { cardId: card.id, snapshot: card },
    },
    { type: 'paragraph' },
  ]
}

export function insertCardBlock(editor: Editor, card: MnCard, position: number): boolean {
  return editor
    .chain()
    .insertContentAt(position, cardContent(card), { updateSelection: true })
    .focus()
    .scrollIntoView()
    .run()
}
