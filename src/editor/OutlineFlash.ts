import { Extension, type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

interface FlashRequest {
  pos: number
  size: number
}

const flashKey = new PluginKey<DecorationSet>('outlineFlash')

export function flashHeading(editor: Editor, pos: number, size: number): void {
  editor.view.dispatch(editor.state.tr.setMeta(flashKey, { pos, size } satisfies FlashRequest))
  window.setTimeout(() => {
    if (editor.isDestroyed) return
    editor.view.dispatch(editor.state.tr.setMeta(flashKey, null))
  }, 1200)
}

export const OutlineFlash = Extension.create({
  name: 'outlineFlash',

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: flashKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, previous) {
            const request = transaction.getMeta(flashKey) as FlashRequest | null | undefined
            if (request) {
              return DecorationSet.create(transaction.doc, [
                Decoration.node(request.pos, request.pos + request.size, {
                  class: 'is-flash',
                }),
              ])
            }
            if (request === null) return DecorationSet.empty
            if (transaction.docChanged) return previous.map(transaction.mapping, transaction.doc)
            return previous
          },
        },
        props: {
          decorations(state) {
            return flashKey.getState(state)
          },
        },
      }),
    ]
  },
})
