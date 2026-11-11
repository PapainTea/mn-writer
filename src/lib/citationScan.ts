/**
 * 引用扫描。
 *
 * 正文里写下的引用会被识别出来，与学习集里的卡片比对。
 * 找不到对应卡片的引用属于缺口，在相关面板里提示补充。
 * 正文里的引用标记与引用出处清单共用这套识别规则，两处结果保持一致。
 */

import type { MnCard } from '../types'

export interface CitationMention {
  /** 原始写法。 */
  text: string
  /** 识别出的引用键，`[@key]` 形式的引用才有。 */
  key?: string
  /** 识别出的作者。 */
  author?: string
  /** 识别出的年份。 */
  year?: string
}

/** Pandoc 形式的引用，例如 `[@wang2024norms, p. 12]`。 */
const PANDOC_SOURCE = '\\[@([^\\]\\s,]+)(?:[,\\s][^\\]]*)?\\]'
/** 中文作者名前的虚词，出现时不属于作者名。 */
const CN_PREFIX_GUARD = '(?![据见按由和与或及在为从的])'
/** 括号内的作者年份，例如 `(Smith, 2023)`、`（张三，2020）`。 */
const PAREN_SOURCE =
  '[(（]\\s*([A-Z][A-Za-z\'’-]*(?:\\s+(?:et\\s+al\\.|&\\s*[A-Z][A-Za-z\'’-]*))?|' +
  CN_PREFIX_GUARD +
  '[一-鿿]{2,4})\\s*[，,]\\s*(\\d{4})[a-z]?\\s*[)）]'
/** 叙述形式的作者年份，例如 `Smith et al. (2023)`、`张三（2020）`。 */
const NARRATIVE_SOURCE =
  '([A-Z][A-Za-z\'’-]*(?:\\s+et\\s+al\\.)?|' +
  CN_PREFIX_GUARD +
  '[一-鿿]{2,4})\\s*[(（]\\s*(\\d{4})[a-z]?\\s*[)）]'

const PANDOC_SINGLE = new RegExp(PANDOC_SOURCE)
const PAREN_SINGLE = new RegExp(PAREN_SOURCE)
const NARRATIVE_SINGLE = new RegExp(NARRATIVE_SOURCE)

/** 三种写法的合并形式，用于扫描引用在正文里的位置。 */
export const CITATION_PATTERN = new RegExp(
  `${PANDOC_SOURCE}|${PAREN_SOURCE}|${NARRATIVE_SOURCE}`,
  'g',
)

/**
 * 不作为作者名的常见说法。
 *
 * 这些词出现在年份之前时属于正文行文，不属于引用。
 */
const STOP_AUTHORS = new Set([
  '如图',
  '见图',
  '见表',
  '如图所示',
  '本节',
  '本表',
  '见附',
  '附表',
  '附图',
  '例如',
  '比如',
  '以及',
  '而且',
  '因此',
  '所以',
  '故而',
  '此外',
  '然而',
  '但是',
  '数据显示',
  '研究表明',
  '结果表明',
  '实验表明',
  '数据',
  '结果',
  '结论',
  '研究',
  '本文',
  '上文',
  '下文',
  '附录',
  '注释',
  '背景',
  '方法',
  '综述',
])

/** 中文作者名前常见的虚词，识别时剥离。 */
const CN_AUTHOR_PREFIX = new Set([
  '据',
  '见',
  '按',
  '由',
  '和',
  '与',
  '或',
  '及',
  '在',
  '是',
  '为',
  '从',
  '的',
])

/** 剥离中文作者名前的虚词，只在名字超过两个字时剥离。 */
function trimAuthorPrefix(author: string): string {
  if (author.length <= 2) return author
  const head = author.slice(0, 1)
  if (CN_AUTHOR_PREFIX.has(head)) return author.slice(1)
  return author
}

function authorKey(author: string): string {
  return author
    .replace(/\s+et\s+al\.?/i, '')
    .replace(/[&'\u2019\s]/g, '')
    .toLowerCase()
}

/** 判断作者名是否属于行文里的常见说法。 */
function isStopAuthor(author: string): boolean {
  return STOP_AUTHORS.has(author.trim())
}

/**
 * 解析一条引用写法。
 *
 * 传入的文本是引用扫描的结果，因此按三种写法依次尝试即可。
 */
export function parseCitation(text: string): CitationMention | null {
  const pandoc = PANDOC_SINGLE.exec(text)
  if (pandoc) {
    const key = pandoc[1]
    return key ? { text, key } : null
  }
  const paren = PAREN_SINGLE.exec(text)
  if (paren) {
    const author = trimAuthorPrefix(paren[1] ?? '')
    if (!author || isStopAuthor(author)) return null
    return { text, author, year: paren[2] }
  }
  const narrative = NARRATIVE_SINGLE.exec(text)
  if (narrative) {
    const author = trimAuthorPrefix(narrative[1] ?? '')
    if (!author || isStopAuthor(author)) return null
    return { text, author, year: narrative[2] }
  }
  return null
}

/**
 * 找出与一条引用对应的卡片。
 *
 * 引用键按完整匹配查找，作者年份按引用键与文献标题查找。
 */
export function matchCitationCards(cards: MnCard[], mention: CitationMention): MnCard[] {
  if (mention.key) {
    const needle = mention.key.toLowerCase()
    return cards.filter((card) => (card.citationKey ?? '').toLowerCase() === needle)
  }
  if (!mention.author || !mention.year) return []
  const needle = authorKey(mention.author)
  if (!needle) return []
  const author = mention.author.trim()
  const year = mention.year
  return cards.filter((card) => {
    const key = (card.citationKey ?? '').toLowerCase()
    if (key && key.includes(needle) && key.includes(year)) return true
    const title = card.documentTitle ?? ''
    return title.includes(year) && title.includes(author)
  })
}

/**
 * 缺口条目的检索词。
 *
 * 作者与年份形式在资料库里一定能命中，
 * 引用键形式取决于资料库里的卡片是否带引用键。
 */
export function citationQuery(mention: CitationMention): string {
  if (mention.author && mention.year) return `${mention.author} ${mention.year}`
  if (mention.key) return mention.key
  return mention.text
}
