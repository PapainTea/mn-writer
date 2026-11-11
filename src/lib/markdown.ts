import type { JSONContent } from '@tiptap/core'
import type { MnCard } from '../types'
import { blockPlainText, cardContentBlocks } from './cardContent'
import { CARD_KIND_LABEL } from './cardSummary'

function inlineToMarkdown(node: JSONContent, footnotes: Map<JSONContent, number>): string {
  if (node.type === 'hardBreak') return '  \n'
  if (node.type === 'footnoteReference') {
    const number = footnotes.get(node) ?? 1
    return `[^${number}]`
  }
  if (node.type === 'crossReference') {
    const label = String(node.attrs?.label ?? '')
    const targetId = String(node.attrs?.targetId ?? '')
    const anchor = node.attrs?.kind === 'heading' ? headingAnchor(label) : targetId
    return `[${label}](#${anchor})`
  }
  if (node.type !== 'text' || !node.text) return ''
  let text = node.text
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') text = `**${text}**`
    if (mark.type === 'italic') text = `*${text}*`
    if (mark.type === 'strike') text = `~~${text}~~`
    if (mark.type === 'code') text = `\`${text}\``
    if (mark.type === 'underline') text = `<u>${text}</u>`
    if (mark.type === 'highlight') text = `<mark>${text}</mark>`
    if (mark.type === 'link' && typeof mark.attrs?.href === 'string') {
      text = `[${text}](${mark.attrs.href})`
    }
  }
  return text
}

/**
 * 生成标题锚点。
 *
 * 多数 Markdown 渲染器按标题文字生成锚点：转小写、去掉标点、空格换成连字符。
 */
function headingAnchor(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
}

function cardToMarkdown(card: MnCard, id: string): string {
  const meta = [card.documentTitle, card.page ? `p.${card.page}` : '', card.citationKey]
    .filter(Boolean)
    .join(' · ')
  // 卡片没有标题时用卡片类型占位，导出的标题行不留空。
  const title = card.title.trim() || CARD_KIND_LABEL[card.kind]
  const lines = [`> [!mn-card] ${title}`]
  for (const block of cardContentBlocks(card)) {
    if (block.kind === 'media') {
      const caption = block.media.caption?.trim() || block.media.alt
      lines.push('>', `> 图片：${caption}`)
      continue
    }
    const body = blockPlainText(block).trim()
    if (!body || body === title) continue
    const prefix = block.source === 'comment' ? '> 批注：' : '> '
    lines.push('>', ...body.split('\n').map((line) => `${prefix}${line}`))
  }
  if (meta) lines.push('>', `> 来源：${meta}`)
  lines.push(`<!-- mn:${id} -->`)
  return lines.join('\n')
}

/**
 * 导出上下文。
 *
 * 脚注编号在导出开始时统一计算，正文引用与文末定义使用同一套编号。
 */
interface ExportContext {
  /** 脚注节点与编号的对应关系。 */
  footnotes: Map<JSONContent, number>
  /** 脚注正文，按编号排列。 */
  footnoteBodies: Map<number, string>
  /** 已导出的表格数量，用于生成表格锚点。 */
  tableCount: number
}

function collectFootnotes(doc: JSONContent): ExportContext {
  const footnotes = new Map<JSONContent, number>()
  const footnoteBodies = new Map<number, string>()
  let number = 0
  const walk = (node: JSONContent) => {
    if (node.type === 'footnoteReference') {
      number += 1
      footnotes.set(node, number)
      footnoteBodies.set(number, String(node.attrs?.content ?? '').trim())
    }
    for (const child of node.content ?? []) walk(child)
  }
  walk(doc)
  return { footnotes, footnoteBodies, tableCount: 0 }
}

function inlineToMarkdownWith(
  node: JSONContent,
  context: ExportContext,
): string {
  return inlineToMarkdown(node, context.footnotes)
}

function blockToMarkdown(node: JSONContent, context: ExportContext): string {
  switch (node.type) {
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6)
      return `${'#'.repeat(level)} ${(node.content ?? [])
        .map((item) => inlineToMarkdownWith(item, context))
        .join('')}`
    }
    case 'paragraph':
      return (node.content ?? []).map((item) => inlineToMarkdownWith(item, context)).join('')
    case 'blockquote':
      return (node.content ?? [])
        .map((item) => blockToMarkdown(item, context))
        .filter(Boolean)
        .join('\n\n')
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    case 'taskList':
      return (node.content ?? [])
        .map((item) => {
          const checked = item.attrs?.checked === true
          const text = (item.content ?? [])
            .map((child) => blockToMarkdown(child, context))
            .join('\n')
          return `- [${checked ? 'x' : ' '}] ${text}`
        })
        .join('\n')
    case 'taskItem':
      return (node.content ?? [])
        .map((child) => blockToMarkdown(child, context))
        .join('\n')
        .split('\n')
        .map((line, index) => (index === 0 ? line : `  ${line}`))
        .join('\n')
    case 'bulletList':
      return (node.content ?? [])
        .map((item) =>
          (item.content ?? []).map((child) => blockToMarkdown(child, context)).join('\n'),
        )
        .map((text) => text.split('\n').map((line) => `- ${line}`).join('\n'))
        .join('\n')
    case 'orderedList':
      return (node.content ?? [])
        .map((item, index) => {
          const text = (item.content ?? [])
            .map((child) => blockToMarkdown(child, context))
            .join('\n')
          return text
            .split('\n')
            .map((line, lineIndex) => (lineIndex === 0 ? `${index + 1}. ${line}` : `   ${line}`))
            .join('\n')
        })
        .join('\n')
    case 'codeBlock':
      return `\`\`\`\n${(node.content ?? [])
        .map((item) => inlineToMarkdownWith(item, context))
        .join('')}\n\`\`\``
    case 'horizontalRule':
      return '---'
    case 'table':
      context.tableCount += 1
      return `<a id="table-${context.tableCount}"></a>\n\n${tableToMarkdown(node, context)}`
    case 'cardBlock': {
      const card = node.attrs?.snapshot as MnCard | undefined
      const id = String(node.attrs?.cardId ?? card?.id ?? '')
      return card ? cardToMarkdown(card, id) : ''
    }
    default:
      return (node.content ?? [])
        .map((item) => blockToMarkdown(item, context))
        .filter(Boolean)
        .join('\n\n')
  }
}

/** 表格导出为 Markdown 的管道表。 */
function tableToMarkdown(node: JSONContent, context: ExportContext): string {
  const rows = node.content ?? []
  const rendered = rows.map((row) => {
    const cells = (row.content ?? []).map((cell) =>
      (cell.content ?? [])
        .map((child) => blockToMarkdown(child, context))
        .join(' ')
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' '),
    )
    return cells
  })
  if (rendered.length === 0) return ''
  const width = Math.max(...rendered.map((row) => row.length))
  const lines: string[] = []
  const header = rendered[0] ?? []
  lines.push(`| ${padCells(header, width).join(' | ')} |`)
  lines.push(`| ${Array.from({ length: width }, () => '---').join(' | ')} |`)
  for (const row of rendered.slice(1)) {
    lines.push(`| ${padCells(row, width).join(' | ')} |`)
  }
  return lines.join('\n')
}

/** 补齐表格单元格数量，保证各列对齐。 */
function padCells(cells: string[], width: number): string[] {
  const result = [...cells]
  while (result.length < width) result.push('')
  return result
}

export function docToMarkdown(doc: JSONContent): string {
  const context = collectFootnotes(doc)
  const body = (doc.content ?? [])
    .map((block) => blockToMarkdown(block, context))
    .filter((block) => block.trim().length > 0)
    .join('\n\n')
  if (context.footnoteBodies.size === 0) return body
  const definitions = [...context.footnoteBodies.entries()]
    .map(([number, text]) => `[^${number}]: ${text || '（脚注内容为空）'}`)
    .join('\n')
  return `${body}\n\n${definitions}`
}
