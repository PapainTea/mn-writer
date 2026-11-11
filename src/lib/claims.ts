/**
 * 断言核对。
 *
 * 一篇扎实的文稿取决于证据如何连接到结论。
 * 断言核对找出文稿里的论证性段落，
 * 检查同一节里有没有证据卡片接住它。
 */

import type { Editor } from '@tiptap/core'

/** 强断言标志词，段落含有其中之一即视为断言段落。 */
const CLAIM_MARKERS = [
  '因此',
  '所以',
  '故而',
  '因而',
  '从而',
  '表明',
  '证明',
  '证实',
  '意味着',
  '可见',
  '由此',
  '据此',
  '综上',
  '总之',
  '数据显示',
  '研究表明',
  '实验表明',
  '结果显示',
  '这说明',
]

/** 段落正文的最少字数，少于该值的段落不计入断言。 */
const MIN_CLAIM_LENGTH = 10
/** 断言与证据卡片相距的区块上限。 */
const NEAR_DISTANCE = 2
/** 断言摘录的最长字数。 */
const CLAIM_EXCERPT = 48

export interface ClaimGap {
  /** 断言段落的位置。 */
  pos: number
  /** 断言段落的开头文字。 */
  text: string
}

export interface ClaimSection {
  /** 与大纲条目一致的标识。 */
  id: string
  /** 断言数量。 */
  total: number
  /** 已有证据支撑的断言数量。 */
  supported: number
  /** 缺少证据的断言。 */
  missing: ClaimGap[]
}

export interface ClaimReport {
  /** 键为节标识，值为该节的断言情况。 */
  sections: Map<string, ClaimSection>
  /** 缺少证据的断言总数。 */
  missingCount: number
}

export interface ClaimIndex {
  /** 键为节标识，值为该节缺少证据的断言数量。 */
  counts: Map<string, number>
  /** 键为节标识，值为该节第一处缺少证据的断言位置。 */
  targets: Map<string, number>
  /** 缺少证据的断言总数。 */
  total: number
}

/**
 * 从核对结果里取出界面需要的索引。
 */
export function buildClaimIndex(report: ClaimReport): ClaimIndex {
  const counts = new Map<string, number>()
  const targets = new Map<string, number>()
  for (const section of report.sections.values()) {
    if (section.missing.length === 0) continue
    counts.set(section.id, section.missing.length)
    const first = section.missing[0]
    if (first) targets.set(section.id, first.pos)
  }
  return { counts, targets, total: report.missingCount }
}

interface Block {
  /** 节点类型。 */
  type: string
  /** 节点文字。 */
  text: string
  /** 节点位置。 */
  pos: number
}

function isClaim(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length < MIN_CLAIM_LENGTH) return false
  return CLAIM_MARKERS.some((marker) => trimmed.includes(marker))
}

function excerpt(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= CLAIM_EXCERPT) return trimmed
  return trimmed.slice(0, CLAIM_EXCERPT) + '…'
}

/**
 * 统计每一节的断言与支撑情况。
 *
 * 节的边界与大纲一致：标题开始，到下一个标题之前结束。
 * 断言段落附近两个区块内有证据卡片，或者该节的证据卡片数量
 * 不少于断言数量时，断言算作已有支撑。
 */
function summarize(id: string, blocks: Block[]): ClaimSection | null {
  const cardIndexes: number[] = []
  const claimIndexes: number[] = []
  blocks.forEach((block, index) => {
    if (block.type === 'cardBlock') {
      cardIndexes.push(index)
      return
    }
    if (block.type === 'paragraph' && isClaim(block.text)) {
      claimIndexes.push(index)
    }
  })
  if (claimIndexes.length === 0) return null

  const enough = cardIndexes.length >= claimIndexes.length
  const missing: ClaimGap[] = []
  let supported = 0
  for (const index of claimIndexes) {
    const near = cardIndexes.some((card) => Math.abs(card - index) <= NEAR_DISTANCE)
    if (near || enough) {
      supported += 1
      continue
    }
    const block = blocks[index]
    if (!block) continue
    missing.push({ pos: block.pos, text: excerpt(block.text) })
  }
  return { id, total: claimIndexes.length, supported, missing }
}

/**
 * 收集文稿的断言核对结果。
 */
export function collectClaims(editor: Editor): ClaimReport {
  const sections = new Map<string, ClaimSection>()
  let currentId = ''
  let blocks: Block[] = []

  const flush = () => {
    if (currentId) {
      const section = summarize(currentId, blocks)
      if (section) sections.set(currentId, section)
    }
    blocks = []
  }

  editor.state.doc.forEach((node, pos) => {
    if (node.type.name === 'heading') {
      flush()
      const text = node.textContent.trim()
      if (!text) return
      const level = Math.min(Math.max(Number(node.attrs.level) || 1, 1), 3)
      currentId = `${pos}-${level}`
      return
    }
    blocks.push({ type: node.type.name, text: node.textContent, pos })
  })
  flush()

  let missingCount = 0
  for (const section of sections.values()) {
    missingCount += section.missing.length
  }
  return { sections, missingCount }
}
