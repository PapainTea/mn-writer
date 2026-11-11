/**
 * 中英文混合分词。
 *
 * 中文按二元组切分，不依赖词典，体积为零。
 * 二元组会把「认知负荷」切成「认知」「知负」「负荷」，
 * 展示时由 `mergeTermSpans` 把相邻片段合回原词。
 * 英文与数字按单词切分，去掉停用词。
 */

const CJK_TEST = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/** 英文停用词，出现频率高，不参与相关度计算。 */
export const ENGLISH_STOPWORDS = new Set([
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'then',
  'there',
  'these',
  'they',
  'this',
  'to',
  'was',
  'were',
  'which',
  'will',
  'with',
])

/** 中文虚词，只在单独成词时剔除，二元组不受影响。 */
export const CHINESE_STOP_CHARS = new Set([
  '的',
  '了',
  '和',
  '是',
  '在',
  '有',
  '与',
  '等',
  '这',
  '那',
  '就',
  '都',
  '而',
  '及',
  '或',
  '也',
  '很',
  '我',
  '你',
  '他',
  '她',
  '它',
  '们',
  '个',
  '中',
  '上',
  '下',
  '个',
])

/** 归一化：全角转半角、统一大小写、压缩空白。 */
export function normalizeText(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

function isCjkRun(segment: string): boolean {
  return CJK_TEST.test(segment)
}

function cjkTokens(segment: string): string[] {
  if (segment.length === 1) {
    return CHINESE_STOP_CHARS.has(segment) ? [] : [segment]
  }
  const tokens: string[] = []
  for (let index = 0; index + 1 < segment.length; index += 1) {
    tokens.push(segment.slice(index, index + 2))
  }
  return tokens
}

function latinTokens(segment: string): string[] {
  const tokens: string[] = []
  for (const word of segment.split(/[^a-z0-9']+/)) {
    const term = word.replace(/^'+|'+$/g, '')
    if (term.length < 2) continue
    if (ENGLISH_STOPWORDS.has(term)) continue
    tokens.push(term)
  }
  return tokens
}

/**
 * 把文本切成检索词。
 *
 * 相同词只保留一次，词序不影响结果。
 */
export function tokenize(value: string): string[] {
  const text = normalizeText(value)
  if (!text) return []
  const segments = text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+|[^\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g)
  if (!segments) return []
  const seen = new Set<string>()
  const tokens: string[] = []
  for (const segment of segments) {
    const list = isCjkRun(segment) ? cjkTokens(segment) : latinTokens(segment)
    for (const term of list) {
      if (seen.has(term)) continue
      seen.add(term)
      tokens.push(term)
    }
  }
  return tokens
}

/** 找出检索词在原文里的出现位置。 */
export function locateTerms(terms: string[], source: string): Map<string, number[]> {
  const text = normalizeText(source)
  const located = new Map<string, number[]>()
  for (const term of terms) {
    const positions: number[] = []
    let from = 0
    for (;;) {
      const at = text.indexOf(term, from)
      if (at < 0) break
      positions.push(at)
      from = at + 1
      if (positions.length >= 32) break
    }
    if (positions.length > 0) located.set(term, positions)
  }
  return located
}

/**
 * 把命中的检索词合成可读的片段。
 *
 * 「认知」「知负」「负荷」在原文里连续出现，合并后显示为「认知负荷」。
 */
export function mergeTermSpans(terms: string[], source: string): string[] {
  const text = normalizeText(source)
  const spans: { start: number; end: number }[] = []
  for (const term of terms) {
    let from = 0
    for (;;) {
      const at = text.indexOf(term, from)
      if (at < 0) break
      spans.push({ start: at, end: at + term.length })
      from = at + 1
      if (spans.length > 64) break
    }
  }
  if (spans.length === 0) return []
  spans.sort((left, right) => left.start - right.start || left.end - right.end)
  const merged: { start: number; end: number }[] = []
  for (const span of spans) {
    const last = merged[merged.length - 1]
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end)
      continue
    }
    merged.push({ ...span })
  }
  return merged.map((span) => text.slice(span.start, span.end))
}
