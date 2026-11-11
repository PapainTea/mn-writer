/**
 * 资料库检索。
 *
 * MarginNote 的 `/search` 接口在整个资料库里匹配卡片、学习集与文档。
 * 这里只取卡片与文献两类匹配，供写作台把学习集之外的材料带进写作过程。
 */

import type { LibraryDocumentHit, LibraryNoteHit, LibrarySearchResult } from '../types'
import { callBridge } from './client'

interface SearchResponse {
  notes?: Array<{
    noteid?: string
    title?: string
    snippet?: string
    topicid?: string
    topicTitle?: string
  }>
  documents?: Array<{ bookmd5?: string; title?: string }>
  truncated?: boolean
}

/** 每类匹配的条数上限。 */
const RESULT_LIMIT = 6

export async function searchLibrary(query: string): Promise<LibrarySearchResult> {
  const params = new URLSearchParams({ q: query, scope: 'all' })
  const response = await callBridge<SearchResponse>(`/search?${params.toString()}`)

  const notes: LibraryNoteHit[] = (response.notes ?? [])
    .filter((item) => Boolean(item.noteid))
    .slice(0, RESULT_LIMIT)
    .map((item) => ({
      id: item.noteid ?? '',
      title: item.title?.trim() ?? '',
      snippet: item.snippet?.trim() ?? '',
      topicId: item.topicid,
      topicTitle: item.topicTitle,
    }))

  const documents: LibraryDocumentHit[] = (response.documents ?? [])
    .filter((item) => Boolean(item.bookmd5))
    .slice(0, RESULT_LIMIT)
    .map((item) => ({
      id: item.bookmd5 ?? '',
      title: item.title?.trim() || '未命名文献',
    }))

  return { notes, documents, truncated: Boolean(response.truncated) }
}
