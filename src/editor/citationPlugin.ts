/**
 * 引用标记插件。
 *
 * 插件在正文里标出每一条引用，并记录当前展开出处的引用。
 * 引用索引由插件维护，界面层从插件状态读取，
 * 正文里的标记、段落末尾的出处卡片与侧栏清单因此始终一致。
 */

import type { Editor } from '@tiptap/core'
import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import {
  buildCitationIndex,
  type CitationEntry,
  type CitationIndex,
} from '../lib/citationIndex'
import { getCitationCards, getCitationVersion } from './citationRegistry'

export const citationPluginKey = new PluginKey<CitationPluginState>('mn-citation')

export interface CitationPluginState {
  /** 卡片集合的版本号。 */
  version: number
  /** 引用索引。 */
  index: CitationIndex
  /** 当前展开出处的引用标识。 */
  selected: string | null
  /** 引用标记的装饰件。 */
  decorations: DecorationSet
}

interface CitationMeta {
  selected?: string | null
}

/** 引用标记的样式类名。 */
function citationClass(entry: CitationEntry, selected: string | null): string {
  const classes = ['mn-citation', entry.cards.length > 0 ? 'has-source' : 'missing-source']
  if (entry.id === selected) classes.push('is-selected')
  return classes.join(' ')
}

/** 生成引用标记的装饰件。 */
function buildDecorations(
  entries: CitationEntry[],
  selected: string | null,
  doc: ProseMirrorNode,
): DecorationSet {
  const decorations = entries.map((entry) =>
    Decoration.inline(entry.from, entry.to, {
      class: citationClass(entry, selected),
      'data-citation-id': entry.id,
    }),
  )
  return DecorationSet.create(doc, decorations)
}

export const CitationPlugin = new Plugin<CitationPluginState>({
  key: citationPluginKey,
  state: {
    init(_config, state) {
      const index = buildCitationIndex(state.doc, getCitationCards())
      return {
        version: getCitationVersion(),
        index,
        selected: null,
        decorations: buildDecorations(index.entries, null, state.doc),
      }
    },
    apply(tr, previous, _oldState, newState) {
      const meta = tr.getMeta(citationPluginKey) as CitationMeta | undefined
      let selected = previous.selected
      if (meta && 'selected' in meta) {
        selected = meta.selected ?? null
      } else if (tr.selectionSet && selected) {
        // 选区离开这条引用以后，出处卡片随之关闭。
        const entry = previous.index.entries.find((item) => item.id === selected)
        const pos = newState.selection.from
        if (!entry || pos < entry.from || pos > entry.to) selected = null
      }

      const version = getCitationVersion()
      const stale = tr.docChanged || version !== previous.version
      const index = stale ? buildCitationIndex(newState.doc, getCitationCards()) : previous.index
      if (!stale && selected === previous.selected) return previous
      return {
        version,
        index,
        selected,
        decorations: buildDecorations(index.entries, selected, newState.doc),
      }
    },
  },
  props: {
    decorations(state) {
      return citationPluginKey.getState(state)?.decorations ?? DecorationSet.empty
    },
    handleClick(view, _pos, event) {
      const target = event.target as HTMLElement | null
      const holder = target?.closest?.('[data-citation-id]')
      const id = holder?.getAttribute('data-citation-id')
      if (!id) return false
      const state = citationPluginKey.getState(view.state)
      const entry = state?.index.entries.find((item) => item.id === id)
      if (!entry) return false
      view.dispatch(
        view.state.tr
          .setSelection(TextSelection.create(view.state.doc, entry.from))
          .setMeta(citationPluginKey, { selected: id })
          .scrollIntoView(),
      )
      return true
    },
    handleKeyDown(view, event) {
      if (event.key !== 'Escape') return false
      const selected = citationPluginKey.getState(view.state)?.selected
      if (!selected) return false
      view.dispatch(view.state.tr.setMeta(citationPluginKey, { selected: null }))
      return true
    },
  },
})

/**
 * 展开一条引用的出处，并把正文移动到该引用。
 */
export function selectCitation(editor: Editor, entry: CitationEntry): void {
  editor.view.dispatch(
    editor.state.tr
      .setSelection(TextSelection.create(editor.state.doc, entry.from))
      .setMeta(citationPluginKey, { selected: entry.id })
      .scrollIntoView(),
  )
}

/** 把引用标记插件包装成 Tiptap 扩展。 */
export const Citation = Extension.create({
  name: 'mnCitation',
  addProseMirrorPlugins() {
    return [CitationPlugin]
  },
})
