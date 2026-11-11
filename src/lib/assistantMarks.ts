/**
 * 助手的依据标记。
 *
 * 模型在引用材料的句子后面标注 `〔卡片 N〕`。
 * 面板把标记渲染成编号徽标，采纳建议时标记转成正文引用。
 */

import type { AssistantEvidence } from './assistant'

/** 依据标记的写法。模型可能使用不同的括号。 */
const MARK_PATTERN = /[〔【[]\s*卡片\s*(\d+)\s*[〕】\]]/g

export interface AssistantMark {
  /** 卡片编号，从 1 开始。 */
  number: number
  /** 标记在文本里的起点。 */
  start: number
  /** 标记在文本里的终点。 */
  end: number
}

export type AssistantSegment =
  | { kind: 'text'; text: string }
  | { kind: 'mark'; number: number; text: string }

/** 找出文本里的全部依据标记。 */
export function findAssistantMarks(text: string): AssistantMark[] {
  const marks: AssistantMark[] = []
  for (const match of text.matchAll(MARK_PATTERN)) {
    const number = Number(match[1])
    if (!Number.isInteger(number) || number < 1) continue
    const start = match.index ?? 0
    marks.push({ number, start, end: start + match[0].length })
  }
  return marks
}

/**
 * 把文本切成文字与标记两段。
 *
 * 面板按段落渲染切分结果，编号徽标因此紧跟对应的句子。
 */
export function splitAssistantResult(text: string): AssistantSegment[] {
  const marks = findAssistantMarks(text)
  if (marks.length === 0) return [{ kind: 'text', text }]
  const segments: AssistantSegment[] = []
  let cursor = 0
  for (const mark of marks) {
    if (mark.start > cursor) {
      segments.push({ kind: 'text', text: text.slice(cursor, mark.start) })
    }
    segments.push({
      kind: 'mark',
      number: mark.number,
      text: text.slice(mark.start, mark.end),
    })
    cursor = mark.end
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) })
  return segments
}

/**
 * 引用键能否写进正文引用。
 *
 * 正文引用的格式不允许空格、逗号与方括号。
 */
function usableCitationKey(key: string | undefined): string | null {
  if (!key) return null
  if (/[\s,[\]]/.test(key)) return null
  return key
}

/**
 * 把依据标记转成正文引用。
 *
 * 卡片带引用键时写成 `[@引用键, p. 页码]`，没有引用键时去掉标记。
 */
export function resolveAssistantMarks(text: string, evidence: AssistantEvidence[]): string {
  return text.replace(MARK_PATTERN, (_match, raw: string) => {
    const item = evidence[Number(raw) - 1]
    if (!item) return ''
    const key = usableCitationKey(item.citationKey)
    if (!key) return ''
    return item.page ? `[@${key}, p. ${item.page}]` : `[@${key}]`
  })
}
