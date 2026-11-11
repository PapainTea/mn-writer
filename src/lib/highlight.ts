/**
 * 命中词标注。
 *
 * 相关度检索给出命中的检索词。界面据此把片段切成若干段，
 * 命中部分单独着色，作者可以直接看出卡片与当前段落的关联点。
 */

export interface TextSpan {
  text: string
  hit: boolean
}

interface Range {
  start: number
  end: number
}

function mergeRanges(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((left, right) => left.start - right.start || left.end - right.end)
  const merged: Range[] = []
  for (const range of sorted) {
    const last = merged[merged.length - 1]
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end)
      continue
    }
    merged.push({ ...range })
  }
  return merged
}

/**
 * 按检索词切分文本。
 *
 * 相邻的命中片段会连成一段，中文二元组因此能还原成完整词语。
 */
export function splitByTerms(text: string, terms: string[]): TextSpan[] {
  if (!text || terms.length === 0) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const ranges: Range[] = []
  for (const term of terms) {
    const needle = term.toLowerCase()
    if (!needle) continue
    let from = 0
    for (;;) {
      const at = lower.indexOf(needle, from)
      if (at < 0) break
      ranges.push({ start: at, end: at + needle.length })
      from = at + 1
      if (ranges.length > 96) break
    }
  }
  if (ranges.length === 0) return [{ text, hit: false }]

  const merged = mergeRanges(ranges)
  const spans: TextSpan[] = []
  let cursor = 0
  for (const range of merged) {
    if (range.start > cursor) spans.push({ text: text.slice(cursor, range.start), hit: false })
    spans.push({ text: text.slice(range.start, range.end), hit: true })
    cursor = range.end
  }
  if (cursor < text.length) spans.push({ text: text.slice(cursor), hit: false })
  return spans
}
