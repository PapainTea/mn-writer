import type { JSONContent } from '@tiptap/core'

function readCardId(node: JSONContent): string | null {
  const attrs = node.attrs
  if (typeof attrs?.cardId === 'string' && attrs.cardId) return attrs.cardId
  const snapshot = attrs?.snapshot as { id?: unknown } | undefined
  return typeof snapshot?.id === 'string' && snapshot.id ? snapshot.id : null
}

export function countInsertedCards(content: JSONContent): Map<string, number> {
  const counts = new Map<string, number>()
  const walk = (node: JSONContent) => {
    if (node.type === 'cardBlock') {
      const id = readCardId(node)
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
      return
    }
    for (const child of node.content ?? []) walk(child)
  }
  walk(content)
  return counts
}
