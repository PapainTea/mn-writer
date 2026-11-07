import type { JSONContent } from '@tiptap/core'

export type CrossRefKind = 'heading' | 'table'

export interface CrossRefTarget {
  /** 目标在文稿里的唯一标识。 */
  id: string
  kind: CrossRefKind
  /** 显示在正文里的引用文字。 */
  label: string
  /** 引用编号，标题与表格分别按出现顺序编号。 */
  number: string
}

export interface CrossRefAttrs {
  /** 目标标识。 */
  targetId: string
  /** 目标种类。 */
  kind: CrossRefKind
  /** 引用时显示的文字。 */
  label: string
}

function isTable(node: JSONContent): boolean {
  return node.type === 'table'
}

function headingText(node: JSONContent): string {
  const parts: string[] = []
  const walk = (item: JSONContent) => {
    if (item.text) parts.push(item.text)
    for (const child of item.content ?? []) walk(child)
  }
  for (const child of node.content ?? []) walk(child)
  return parts.join('').trim()
}

/**
 * 收集文稿里可被引用的目标。
 *
 * 标题与表格各自编号，编号顺序与正文出现顺序一致。
 */
export function collectCrossRefTargets(doc: JSONContent): CrossRefTarget[] {
  const targets: CrossRefTarget[] = []
  let headingNumber = 0
  let tableNumber = 0

  const walk = (node: JSONContent) => {
    if (node.type === 'heading') {
      const text = headingText(node)
      if (text) {
        headingNumber += 1
        targets.push({
          id: `heading-${headingNumber}-${text}`,
          kind: 'heading',
          label: text,
          number: String(headingNumber),
        })
      }
    }
    if (isTable(node)) {
      tableNumber += 1
      targets.push({
        id: `table-${tableNumber}`,
        kind: 'table',
        label: `表 ${tableNumber}`,
        number: String(tableNumber),
      })
    }
    for (const child of node.content ?? []) walk(child)
  }

  walk(doc)
  return targets
}

/** 按种类分组，便于在选择面板里分区展示。 */
export function groupCrossRefTargets(
  targets: CrossRefTarget[],
): Array<{ kind: CrossRefKind; label: string; items: CrossRefTarget[] }> {
  const groups: Array<{ kind: CrossRefKind; label: string; items: CrossRefTarget[] }> = [
    { kind: 'heading', label: '标题', items: [] },
    { kind: 'table', label: '表格', items: [] },
  ]
  for (const target of targets) {
    const group = groups.find((item) => item.kind === target.kind)
    group?.items.push(target)
  }
  return groups.filter((group) => group.items.length > 0)
}
