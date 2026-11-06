import type { JSONContent } from '@tiptap/core'
import type { MnCard } from '../types'

function inlineToMarkdown(node: JSONContent): string {
  if (node.type === 'hardBreak') return '  \n'
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

function cardToMarkdown(card: MnCard, id: string): string {
  const meta = [card.documentTitle, card.page ? `p.${card.page}` : '', card.citationKey]
    .filter(Boolean)
    .join(' · ')
  const lines = [
    `> [!mn-card] ${card.title}`,
    ...card.excerpt.split('\n').map((line) => `> ${line}`),
  ]
  for (const comment of card.comments) {
    const body =
      comment.format === 'markdown'
        ? comment.text
        : comment.format === 'html' || comment.format === 'rich'
          ? comment.text.replace(/<[^>]+>/g, ' ')
          : comment.text
    lines.push('>', ...body.split('\n').map((line) => `> 批注：${line}`))
  }
  if (meta) lines.push('>', `> 来源：${meta}`)
  lines.push(`<!-- mn:${id} -->`)
  return lines.join('\n')
}

function blockToMarkdown(node: JSONContent): string {
  switch (node.type) {
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6)
      return `${'#'.repeat(level)} ${(node.content ?? []).map(inlineToMarkdown).join('')}`
    }
    case 'paragraph':
      return (node.content ?? []).map(inlineToMarkdown).join('')
    case 'blockquote':
      return (node.content ?? [])
        .map(blockToMarkdown)
        .filter(Boolean)
        .join('\n\n')
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    case 'bulletList':
      return (node.content ?? [])
        .map((item) => (item.content ?? []).map(blockToMarkdown).join('\n'))
        .map((text) => text.split('\n').map((line) => `- ${line}`).join('\n'))
        .join('\n')
    case 'orderedList':
      return (node.content ?? [])
        .map((item, index) => {
          const text = (item.content ?? []).map(blockToMarkdown).join('\n')
          return text
            .split('\n')
            .map((line, lineIndex) => (lineIndex === 0 ? `${index + 1}. ${line}` : `   ${line}`))
            .join('\n')
        })
        .join('\n')
    case 'codeBlock':
      return `\`\`\`\n${(node.content ?? []).map(inlineToMarkdown).join('')}\n\`\`\``
    case 'horizontalRule':
      return '---'
    case 'cardBlock': {
      const card = node.attrs?.snapshot as MnCard | undefined
      const id = String(node.attrs?.cardId ?? card?.id ?? '')
      return card ? cardToMarkdown(card, id) : ''
    }
    default:
      return (node.content ?? []).map(blockToMarkdown).filter(Boolean).join('\n\n')
  }
}

export function docToMarkdown(doc: JSONContent): string {
  return (doc.content ?? [])
    .map(blockToMarkdown)
    .filter((block) => block.trim().length > 0)
    .join('\n\n')
}
