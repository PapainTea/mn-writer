/**
 * 旧快照补齐。
 *
 * 早期版本把正文首段当成了卡片标题存进快照。
 * 学习集里的卡片能读到真实标题，这里用真实标题补齐旧快照，
 * 补齐之后快照带有预览字段，不再重复处理。
 */

import type { Editor } from '@tiptap/core'
import { useEffect } from 'react'
import { sameText } from '../lib/cardSummary'
import type { MnCard } from '../types'

interface SnapshotSyncOptions {
  editor: Editor | null
  /** 学习集里的卡片。 */
  cards: MnCard[]
  /** 文稿内容装载完成的标记，文稿切换后重新补齐。 */
  revision: number
}

export function useSnapshotSync({ editor, cards, revision }: SnapshotSyncOptions) {
  useEffect(() => {
    if (!editor || cards.length === 0) return
    const byId = new Map(cards.map((card) => [card.id, card]))
    const targets: { pos: number; snapshot: MnCard }[] = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'cardBlock') return
      const snapshot = node.attrs.snapshot as MnCard | null
      // 快照带有预览字段时说明来自新版本，标题无需补齐。
      if (!snapshot || snapshot.preview !== undefined) return
      targets.push({ pos, snapshot })
    })
    if (targets.length === 0) return

    const tr = editor.state.tr
    let changed = false
    // 位置倒序更新，避免前面的替换影响后面的偏移量。
    for (const item of [...targets].reverse()) {
      const card = byId.get(item.snapshot.id)
      if (!card) continue
      const node = editor.state.doc.nodeAt(item.pos)
      if (!node || node.type.name !== 'cardBlock') continue
      // 快照与实时卡片的正文不一致时，两者不是同一张卡片，不改写标题。
      if (!sameText(item.snapshot.excerpt, card.excerpt)) continue
      if (item.snapshot.title === card.title && item.snapshot.preview === card.preview) continue
      tr.setNodeMarkup(item.pos, undefined, {
        ...node.attrs,
        cardId: card.id,
        snapshot: { ...item.snapshot, title: card.title, preview: card.preview },
      })
      changed = true
    }
    if (changed) editor.view.dispatch(tr)
  }, [editor, cards, revision])
}
