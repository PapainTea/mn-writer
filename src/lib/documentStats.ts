import type { JSONContent } from '@tiptap/core'

export interface DocumentStats {
  /** 字数，中文按字计、外文按词计，与 Word 的「字数」口径一致。 */
  words: number
  /** 字符数，不计空格。 */
  characters: number
  /** 字符数，计空格。 */
  charactersWithSpaces: number
  /** 中日韩字符数。 */
  cjkCharacters: number
  /** 外文词数。 */
  foreignWords: number
  /** 段落数。 */
  paragraphs: number
  /** 行数，按每行约 38 个字符估算。 */
  lines: number
  /** 页数，按每页约 36 行估算。 */
  pages: number
  /** 插入的卡片数量。 */
  cards: number
  /** 脚注数量。 */
  footnotes: number
  /** 表格数量。 */
  tables: number
  /** 图片数量。 */
  images: number
}

const CJK_GLOBAL = /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]/g
const WORD_LIKE = /[A-Za-z0-9À-ɏЀ-ӿ]+(?:['’-][A-Za-z0-9À-ɏЀ-ӿ]+)*/g

const CHARS_PER_LINE = 38
const LINES_PER_PAGE = 36

interface TextCount {
  characters: number
  charactersWithSpaces: number
  cjkCharacters: number
  foreignWords: number
}

/**
 * 统计一段文字。
 *
 * 中文按字计，外文按词计，标点与空白不计入字数但计入字符数。
 */
function countText(text: string): TextCount {
  const trimmed = text.trim()
  if (!trimmed) {
    return { characters: 0, charactersWithSpaces: 0, cjkCharacters: 0, foreignWords: 0 }
  }
  const cjkMatches = trimmed.match(CJK_GLOBAL) ?? []
  const withoutCjk = trimmed.replace(CJK_GLOBAL, ' ')
  const foreignMatches = withoutCjk.match(WORD_LIKE) ?? []
  return {
    characters: [...trimmed.replace(/\s/g, '')].length,
    charactersWithSpaces: [...trimmed].length,
    cjkCharacters: cjkMatches.length,
    foreignWords: foreignMatches.length,
  }
}

/**
 * 统计文稿。
 *
 * 统计范围覆盖正文、卡片内的文字、脚注与表格，
 * 因此字数与用户在屏幕上看到的内容一致。
 */
export function collectDocumentStats(doc: JSONContent): DocumentStats {
  let characters = 0
  let charactersWithSpaces = 0
  let cjkCharacters = 0
  let foreignWords = 0
  let paragraphs = 0
  let cards = 0
  let footnotes = 0
  let tables = 0
  let images = 0

  const addText = (text: string) => {
    const counted = countText(text)
    characters += counted.characters
    charactersWithSpaces += counted.charactersWithSpaces
    cjkCharacters += counted.cjkCharacters
    foreignWords += counted.foreignWords
  }

  const walk = (node: JSONContent) => {
    if (node.type === 'text' && node.text) {
      addText(node.text)
      return
    }
    if (node.type === 'cardBlock') {
      cards += 1
      const snapshot = node.attrs?.snapshot as
        | { title?: string; excerpt?: string; comments?: Array<{ text?: string }> }
        | undefined
      if (snapshot) {
        if (snapshot.title) addText(snapshot.title)
        if (snapshot.excerpt) addText(snapshot.excerpt)
        for (const comment of snapshot.comments ?? []) {
          if (comment.text) addText(comment.text)
        }
      }
      return
    }
    if (node.type === 'footnoteReference') {
      footnotes += 1
      const content = String(node.attrs?.content ?? '')
      if (content) addText(content)
      return
    }
    if (node.type === 'table') {
      tables += 1
    }
    if (node.type === 'image') {
      images += 1
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      paragraphs += 1
    }
    for (const child of node.content ?? []) walk(child)
  }

  walk(doc)

  const words = cjkCharacters + foreignWords
  const lines = Math.max(1, Math.ceil(charactersWithSpaces / CHARS_PER_LINE))

  return {
    words,
    characters,
    charactersWithSpaces,
    cjkCharacters,
    foreignWords,
    paragraphs,
    lines,
    pages: Math.max(1, Math.ceil(lines / LINES_PER_PAGE)),
    cards,
    footnotes,
    tables,
    images,
  }
}

/** 按中文阅读速度估算阅读时长，单位为分钟。 */
export function readingMinutes(stats: DocumentStats): number {
  return Math.max(1, Math.round(stats.words / 400))
}
