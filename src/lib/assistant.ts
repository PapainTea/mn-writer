/**
 * 段落助手。
 *
 * 助手的输出必须落在给定的证据范围内。
 * 提示词把卡片原文与当前段落一起交给模型，
 * 并写明不得引入材料之外的信息。
 */

import type { LlmMessage } from '../mn/llm'

export type AssistantAction = 'polish' | 'continue' | 'points'

export interface AssistantTask {
  action: AssistantAction
  label: string
  description: string
}

export const ASSISTANT_TASKS: AssistantTask[] = [
  { action: 'polish', label: '润色', description: '在保留原意的前提下改善表达' },
  { action: 'continue', label: '续写', description: '依据材料补出接下来的句子' },
  { action: 'points', label: '要点', description: '提炼段落的主张与依据' },
]

export interface AssistantEvidence {
  /** 卡片标识。 */
  title: string
  /** 来源说明：文献名与页码。 */
  source: string
  /** 原文片段。 */
  excerpt: string
  /** 引用键。有引用键时，采纳建议会写成正文引用。 */
  citationKey?: string
  /** 页码。 */
  page?: number
  /** 概念扩展命中时的关联路径。 */
  via?: { term: string; bridge: string }
}

/** 助手的写作语境。 */
export interface AssistantContext {
  /** 文稿标题。 */
  title?: string
  /** 段落所在标题。 */
  heading?: string
  /** 上一段的文字，供续写承接语气与论证。 */
  previous?: string
  /** 文稿术语表，助手需要沿用其中的写法。 */
  glossary?: string[]
}

const SYSTEM_PROMPT = [
  '你是一位研究写作助手，服务于正在撰写论文的研究者。',
  '',
  '硬性规则：',
  '一、只使用材料中出现的信息，不得引入材料之外的结论、数据或文献。',
  '二、材料不足以支撑的内容不要写，宁可说明缺少依据。',
  '三、保留原文中的引用标记、数字、变量名与专有名词。',
  '四、保持原文的学科术语与表述习惯，不替换成近义词。',
  '五、文稿术语表里的写法优先于其他说法，不要混用同义词。',
  '六、只输出结果本身，不加标题、不加解释、不加前后缀。',
  '七、凡是由材料支持的句子，在句末标注依据编号，写成〔卡片 N〕，N 是材料清单里的编号。材料没有支持的内容不标注编号。',
].join('\n')

const INSTRUCTIONS: Record<AssistantAction, string> = {
  polish: '改写下面的段落，使表达更清楚、更紧凑。保留全部事实、引用标记与依据编号，不增加新信息。直接给出改写后的段落。',
  continue: '在下面的段落之后接着写一到两句。内容必须由材料支持，与原文语气一致，每一句标注依据编号。直接给出续写的文字。',
  points: '用三到五条列出下面段落的主张与对应依据，每条一行，每行以「- 」开头，每条末尾标注对应的依据编号。不要复述原文措辞。',
}

/** 组装提示词。 */
export function buildAssistantMessages(
  action: AssistantAction,
  paragraph: string,
  evidence: AssistantEvidence[],
  context: AssistantContext = {},
): LlmMessage[] {
  const materials: string[] = []
  if (evidence.length > 0) {
    materials.push('材料：', '材料编号从 1 开始。')
    evidence.forEach((item, index) => {
      materials.push(`【卡片 ${index + 1}】${item.title}`)
      if (item.source) materials.push(`来源：${item.source}`)
      if (item.excerpt) materials.push(`原文：${item.excerpt}`)
      if (item.via) {
        materials.push(
          `与当前段落的共同词：「${item.via.bridge}」。该卡片靠这个词与段落关联，不是直接命中。`,
        )
      }
    })
    materials.push('写出由材料支持的句子时，在句末标注依据编号，写成〔卡片 N〕。')
  } else {
    materials.push('材料：当前没有可用的卡片，只能依据段落本身作答，并说明缺少依据。')
  }

  const contextParts: string[] = []
  if (context.title) contextParts.push(`文稿标题：${context.title}`)
  if (context.heading) contextParts.push(`所在标题：${context.heading}`)
  if (context.previous) contextParts.push(`上一段：\n${context.previous}`)
  if (context.glossary && context.glossary.length > 0) {
    contextParts.push(`文稿术语：${context.glossary.join('、')}`)
  }
  contextParts.push(`当前段落：\n${paragraph}`)

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: [INSTRUCTIONS[action], '', ...materials, '', ...contextParts].join('\n') },
  ]
}

/** 去掉模型输出里多余的包裹。 */
export function cleanAssistantOutput(text: string): string {
  let value = text.trim()
  const fence = value.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/)
  if (fence?.[1]) value = fence[1].trim()
  value = value.replace(/^(建议|结果|改写|续写)[：:]\s*/, '')
  value = value.replace(/`([^`\n]+)`/g, '$1')
  return value.trim()
}
