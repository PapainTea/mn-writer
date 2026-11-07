import type { Editor } from '@tiptap/core'
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { blockPlainText, cardContentBlocks, cardHasText } from '../lib/cardContent'
import type { MnCard } from '../types'

/** 把多行文本拆成若干段，空行不产生空段落。 */
function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** 构造标题段落，标题文本附加加粗标记。 */
function titleParagraph(editor: Editor, title: string): ProseMirrorNode | null {
  const text = title.trim()
  if (!text) return null
  const schema = editor.schema
  const paragraph = schema.nodes.paragraph
  if (!paragraph) return null
  const bold = schema.marks.bold
  const content = bold
    ? schema.text(text, [bold.create()])
    : schema.text(text)
  return paragraph.create(null, content)
}

/** 构造普通段落，段落为空时返回 null。 */
function plainParagraph(editor: Editor, text: string): ProseMirrorNode | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const paragraph = editor.schema.nodes.paragraph
  if (!paragraph) return null
  return paragraph.create(null, editor.schema.text(trimmed))
}

/**
 * 把一张卡片转换为正文段落，只保留标题、摘录与批注。
 * 来源标题、页码、标签、引用键与卡片引用都不保留。
 */
export function cardToParagraphs(editor: Editor, card: MnCard): ProseMirrorNode[] {
  const paragraphs: ProseMirrorNode[] = []

  // 标题与正文内容相同时只保留正文，转换后不会出现两份同样的内容。
  const title = card.title.trim()
  if (title && !cardHasText(card, title)) {
    const node = titleParagraph(editor, title)
    if (node) paragraphs.push(node)
  }

  for (const block of cardContentBlocks(card)) {
    if (block.kind === 'media') continue
    for (const line of splitLines(blockPlainText(block))) {
      const paragraph = plainParagraph(editor, line)
      if (paragraph) paragraphs.push(paragraph)
    }
  }

  return paragraphs
}

/**
 * 用正文段落替换一张卡片。整个替换在单个事务内完成，事务可被撤销。
 */
export function replaceCardWithText(
  editor: Editor,
  pos: number,
  node: ProseMirrorNode,
  card: MnCard,
): boolean {
  const paragraphs = cardToParagraphs(editor, card)
  if (paragraphs.length === 0) return false

  const tr = editor.state.tr.replaceWith(pos, pos + node.nodeSize, Fragment.fromArray(paragraphs))
  editor.view.dispatch(tr)
  return true
}

/**
 * 生成 Pandoc BibTeX 引用文本。
 *
 * 页码来自卡片所属文档的位置；没有页码时只写引用键。
 */
export function citationText(card: MnCard): string | null {
  const key = card.citationKey?.trim()
  if (!key) return null
  const page = typeof card.page === 'number' && card.page > 0 ? `, p. ${card.page}` : ''
  return `[@${key}${page}]`
}

/**
 * 把一张卡片替换为正文段落，并在末尾追加引用。
 *
 * 卡片没有引用键时不转换，调用方据此提示原因。
 */
export function replaceCardWithCitation(
  editor: Editor,
  pos: number,
  node: ProseMirrorNode,
  card: MnCard,
): boolean {
  const citation = citationText(card)
  if (!citation) return false
  const paragraphs = cardToParagraphs(editor, card)
  const paragraph = editor.schema.nodes.paragraph
  if (!paragraph) return false
  paragraphs.push(paragraph.create(null, editor.schema.text(citation)))

  const tr = editor.state.tr.replaceWith(pos, pos + node.nodeSize, Fragment.fromArray(paragraphs))
  editor.view.dispatch(tr)
  return true
}
