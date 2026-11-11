/**
 * 引用索引。
 *
 * 索引把正文里的引用与学习集里的卡片对应起来，
 * 供正文里的引用标记、段落末尾的出处卡片与侧栏清单共用。
 */

import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { CITATION_PATTERN, matchCitationCards, parseCitation } from './citationScan'
import type { MnCard } from '../types'

export interface CitationEntry {
  /** 引用标识。 */
  id: string
  /** 引用在正文里的起始位置。 */
  from: number
  /** 引用在正文里的结束位置。 */
  to: number
  /** 引用的原始写法。 */
  text: string
  /** 引用键。 */
  key?: string
  /** 作者。 */
  author?: string
  /** 年份。 */
  year?: string
  /** 学习集里与这条引用对应的卡片。 */
  cards: MnCard[]
}

export interface CitationSection {
  /** 与大纲条目一致的标识。 */
  id: string
  /** 节标题。 */
  title: string
  /** 节标题在正文里的位置。 */
  from: number
  /** 本节的引用。 */
  entries: CitationEntry[]
}

export interface CitationIndex {
  /** 正文里的全部引用。 */
  entries: CitationEntry[]
  /** 按节分组的引用。 */
  sections: CitationSection[]
}

/** 空索引，编辑器尚未建立时使用。 */
export const EMPTY_CITATION_INDEX: CitationIndex = { entries: [], sections: [] }

interface Segment {
  /** 段内文字的起点。 */
  start: number
  /** 段内文字的终点。 */
  end: number
  /** 这段文字在正文里的起点。 */
  pos: number
}

/**
 * 取出一个文本块内部各段文字的位置。
 *
 * 文字偏移与正文位置的换算需要按块内的文字段落逐段累加，
 * 脚注一类的行内节点只占位置，不占文字。
 */
function blockSegments(block: ProseMirrorNode, blockPos: number): Segment[] {
  const segments: Segment[] = []
  let text = 0
  let pos = blockPos + 1
  block.content.forEach((child) => {
    const length = child.isText ? (child.text?.length ?? 0) : 0
    if (length > 0) segments.push({ start: text, end: text + length, pos })
    text += length
    pos += child.nodeSize
  })
  return segments
}

/** 把块内的文字偏移换算成正文位置。 */
function positionAt(segments: Segment[], offset: number): number {
  for (const segment of segments) {
    if (offset >= segment.start && offset < segment.end) {
      return segment.pos + (offset - segment.start)
    }
  }
  return -1
}

/**
 * 扫描正文里的引用。
 *
 * 引用按节分组，节的边界与大纲一致：标题开始，到下一个标题之前结束。
 */
export function scanCitations(doc: ProseMirrorNode): {
  entries: CitationEntry[]
  sections: CitationSection[]
} {
  const entries: CitationEntry[] = []
  const sections: CitationSection[] = []
  let current: CitationSection | null = null

  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const level = Math.min(Math.max(Number(node.attrs.level) || 1, 1), 3)
      current = {
        id: `${pos}-${level}`,
        title: node.textContent.trim(),
        from: pos,
        entries: [],
      }
      sections.push(current)
    }
    if (!node.isTextblock) return true
    const text = node.textContent
    if (text) {
      const segments = blockSegments(node, pos)
      for (const match of text.matchAll(CITATION_PATTERN)) {
        const start = match.index
        const from = positionAt(segments, start)
        const last = positionAt(segments, start + match[0].length - 1)
        if (from < 0 || last < 0) continue
        const mention = parseCitation(match[0])
        if (!mention) continue
        const entry: CitationEntry = {
          id: `${from}-${last + 1}`,
          from,
          to: last + 1,
          text: match[0],
          key: mention.key,
          author: mention.author,
          year: mention.year,
          cards: [],
        }
        entries.push(entry)
        current?.entries.push(entry)
      }
    }
    return false
  })

  return { entries, sections }
}

/**
 * 建立引用索引。
 *
 * 引用与学习集卡片的对应关系在这里建立一次，界面各处读取同一份结果。
 */
export function buildCitationIndex(doc: ProseMirrorNode, cards: MnCard[]): CitationIndex {
  const { entries, sections } = scanCitations(doc)
  for (const entry of entries) {
    entry.cards = matchCitationCards(cards, {
      text: entry.text,
      key: entry.key,
      author: entry.author,
      year: entry.year,
    })
  }
  return { entries, sections }
}

/**
 * 找出光标所在的节。
 *
 * 节的起点是标题的位置，末尾是下一个标题之前。
 */
export function sectionAt(sections: CitationSection[], pos: number): CitationSection | null {
  let current: CitationSection | null = null
  for (const section of sections) {
    if (section.from > pos) break
    current = section
  }
  return current
}
