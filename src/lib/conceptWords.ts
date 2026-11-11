/**
 * 概念词的切分与筛除。
 *
 * 概念扩展依赖词的准确切分。切分结果同时决定三件事：
 * 哪些词参与检索、哪些词能作为连接两个卡片的桥梁、哪些词过于常见而没有说明作用。
 */

import type { MnCard } from '../types'
import { CHINESE_STOP_CHARS, ENGLISH_STOPWORDS, normalizeText, tokenize } from './tokenize'

interface SegmentPart {
  segment: string
  isWordLike?: boolean
}

interface SegmenterLike {
  segment: (input: string) => Iterable<SegmentPart>
}

type SegmenterConstructor = new (
  locales: string,
  options: { granularity: 'word' },
) => SegmenterLike

function createSegmenter(): SegmenterLike | null {
  const Constructor = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter
  if (!Constructor) return null
  return new Constructor('zh', { granularity: 'word' })
}

const segmenter = createSegmenter()

/** 以虚词结尾的词多为跨词碎片，例如「中的」「研究中的」。 */
const STOP_SUFFIX = /[的了和是在有与等这那就都而及或也]$/

/** 写作台界面与卡片元数据里的词，不参与概念扩展。 */
const META_WORDS = new Set([
  '卡片',
  '摘录',
  '引用',
  '标签',
  '笔记',
  '文档',
  '页面',
  '面板',
  '列表',
  '插入',
  '当前',
  '材料',
  '来源',
  '正文',
  '标题',
  '批注',
  '内容',
  '文件',
  '功能',
  '按钮',
  '菜单',
  '编辑',
  '保存',
  '复制',
  '粘贴',
  '格式',
  '段落',
  '章节',
  '文稿',
  '点击',
  '选中',
  '工具栏',
  '侧栏',
  '弹窗',
  '快捷键',
])

/**
 * 过于常见、无法说明关联的词。
 *
 * 这些词出现在卡片里只说明卡片属于同一门学科，不说明卡片与当前段落有关。
 * 扩展词从这些词里选取时，连接关系无法解释，作者无从判断。
 */
const GENERIC_WORDS = new Set([
  '研究',
  '讨论',
  '方法',
  '定义',
  '背景',
  '文献',
  '结果',
  '分析',
  '案例',
  '问题',
  '证据',
  '结论',
  '观点',
  '综述',
  '报告',
  '数据',
  '模型',
  '意义',
  '作用',
  '影响',
  '因素',
  '条件',
  '程度',
  '差异',
  '变化',
  '效果',
  '提升',
  '状况',
  '关系',
  '特征',
  '表现',
  '价值',
  '说明',
  '局限',
  '实验',
  '设计',
  '材料',
  '机制',
  '理论',
  '实践',
  '视角',
  '框架',
  '形式',
  '内容',
  '方式',
  '阶段',
  '状态',
  '数量',
  '水平',
  '基础',
  '核心',
  '关键',
  '主要',
  '一般',
  '具体',
  '整体',
  '部分',
  '相关',
  '可能',
  '需要',
  '应该',
  '可以',
  '通过',
  '进行',
  '出现',
  '存在',
  '具有',
  '包括',
  '涉及',
  '以及',
  '或者',
  '同时',
  '因此',
  '但是',
  '然而',
  '而且',
  '所以',
  '因为',
  '如果',
  '虽然',
  '例如',
  '比如',
  '指出',
  '表明',
  '认为',
  '提出',
  '显示',
  '观察',
  '强调',
  '关注',
  '依据',
  '用于',
  '基于',
  '根据',
  '之间',
  '如何',
  '对应',
  '保留',
  '记录',
  '开始',
  '结束',
  '完成',
  '一种',
  '这些',
  '那些',
  '一些',
  '很多',
  '更多',
  '更加',
  '特别',
  '比较',
  '情况',
  'research',
  'study',
  'method',
  'result',
  'analysis',
  'discussion',
  'conclusion',
  'approach',
  'model',
  'data',
  'paper',
  'evidence',
  'context',
  'framework',
  'finding',
  'review',
])

/** 只表示状态的标签不提供内容。 */
const STATE_NAMESPACES = new Set(['status', '状态', 'state', 'progress', '进度'])

/** 表示状态的词首。 */
const STATE_PREFIX = /^[已未待在]/

function isNoise(word: string): boolean {
  if (/^\d+$/.test(word)) return true
  if (ENGLISH_STOPWORDS.has(word)) return true
  if (word.length === 1 && CHINESE_STOP_CHARS.has(word)) return true
  if (STOP_SUFFIX.test(word)) return true
  if (META_WORDS.has(word)) return true
  return false
}

/** 判断词是否过于常见，无法说明卡片与当前段落之间的关联。 */
export function isGeneric(word: string): boolean {
  return GENERIC_WORDS.has(word)
}

/**
 * 把文本切成概念词。
 *
 * 浏览器不支持分词接口时退回二元组，此时扩展结果的精度会下降。
 */
export function conceptWords(value: string): string[] {
  const text = normalizeText(value)
  if (!text) return []
  if (!segmenter) {
    return tokenize(value).filter((term) => !isNoise(term))
  }
  const words: string[] = []
  for (const part of segmenter.segment(text)) {
    if (!part.isWordLike) continue
    const word = part.segment.trim()
    if (word.length < 2 || isNoise(word)) continue
    words.push(word)
  }
  return words
}

/**
 * 标签里的斜杠左边是分类名，右边才是内容。
 *
 * `topic/合作` 提供的是「合作」，`topic` 只说明标签的分类方式。
 * `status/已精读` 只说明卡片的状态，不提供内容。
 */
export function tagText(tags: string[]): string {
  return tags
    .map((tag) => {
      const at = tag.lastIndexOf('/')
      const namespace = at < 0 ? '' : tag.slice(0, at)
      const content = at < 0 ? tag : tag.slice(at + 1)
      if (STATE_NAMESPACES.has(namespace)) return ''
      if (STATE_PREFIX.test(content)) return ''
      return content
    })
    .filter(Boolean)
    .join(' ')
}

/** 卡片上可以用于检索的全部文字。 */
export function cardText(card: MnCard): string {
  return [
    card.title,
    card.excerpt,
    card.preview ?? '',
    tagText(card.tags),
    card.documentTitle ?? '',
    ...card.comments.map((comment) => comment.text),
  ]
    .filter(Boolean)
    .join(' ')
}

/** 统计文本里每个概念词出现的次数。 */
export function countWords(text: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const word of conceptWords(text)) {
    map.set(word, (map.get(word) ?? 0) + 1)
  }
  return map
}
