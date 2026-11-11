/**
 * 缺口检索词。
 *
 * 段落里最长的词是作者真正在写的内容。
 * 命中卡片没有提到这个词，学习集里也没有这个词，
 * 说明材料缺失，资料库是唯一的去处。
 */

import { conceptWords } from './conceptWords'

/** 检索词的最少字数。 */
const MIN_QUERY_LENGTH = 2

/** 段落里最长的概念词。 */
export function longestConceptWord(text: string): string {
  let best = ''
  for (const word of conceptWords(text)) {
    if (word.length > best.length) best = word
  }
  return best
}

/**
 * 选出用于检索资料库的词。
 *
 * 取没有出现在已知词里的最长概念词。没有这样的词时返回空串。
 */
export function pickGapQuery(paragraph: string, knownWords: Set<string>): string {
  let best = ''
  for (const word of conceptWords(paragraph)) {
    if (word.length < MIN_QUERY_LENGTH) continue
    if (knownWords.has(word)) continue
    if (word.length > best.length) best = word
  }
  return best
}
