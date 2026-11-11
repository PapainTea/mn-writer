/**
 * 证据条装饰件。
 *
 * 插件在当前段落末尾放一个空容器，React 把证据条传送到该容器。
 * 锚点由插件根据选区自行计算，文档变化时位置自动跟随映射，
 * 不需要界面层反复下发坐标。
 */

import type { EditorState } from '@tiptap/pm/state'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { getParagraphSlot, setParagraphSlot } from './paragraphSlot'
import { Extension } from '@tiptap/core'

export const evidencePluginKey = new PluginKey<EvidencePluginState>('mn-evidence')

export interface EvidencePluginState {
  /** 段落末尾位置，空值表示不显示证据条。 */
  anchor: number | null
}

/** 取当前文本段落末尾的位置，标题与其他块不放置证据条。 */
function findAnchor(state: EditorState): number | null {
  const { $from } = state.selection
  if ($from.depth < 1) return null
  const parent = $from.parent
  if (parent.type.name !== 'paragraph') return null
  return $from.before($from.depth) + parent.nodeSize
}

export const EvidencePlugin = new Plugin<EvidencePluginState>({
  key: evidencePluginKey,
  state: {
    init: () => ({ anchor: null }),
    apply(_transaction, previous, _oldState, newState) {
      const anchor = findAnchor(newState)
      if (anchor === previous.anchor) return previous
      return { anchor }
    },
  },
  props: {
    decorations(state) {
      const anchor = evidencePluginKey.getState(state)?.anchor ?? null
      if (anchor === null) return DecorationSet.empty
      const widget = Decoration.widget(
        anchor,
        () => {
          const dom = document.createElement('div')
          dom.className = 'mn-paragraph-slot'
          setParagraphSlot(dom)
          return dom
        },
        {
          side: 1,
          key: 'mn-evidence',
          // 证据条里的按钮不应影响正文的选区。
          stopEvent: () => true,
          destroy: (node) => {
            // 新插槽先于旧插槽销毁，只有当前插槽才需要清空。
            if (getParagraphSlot() === node) setParagraphSlot(null)
          },
        },
      )
      return DecorationSet.create(state.doc, [widget])
    },
  },
})

/** 把装饰件插件包装成 Tiptap 扩展。 */
export const Evidence = Extension.create({
  name: 'mnEvidence',
  addProseMirrorPlugins() {
    return [EvidencePlugin]
  },
})
