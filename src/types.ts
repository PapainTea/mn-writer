import type { JSONContent } from '@tiptap/core'

export type CardKind = 'excerpt' | 'note' | 'literature'

export type CommentFormat = 'text' | 'markdown' | 'html' | 'rich'

export interface MnComment {
  text: string
  format: CommentFormat
}

export type MnMediaKind = 'image' | 'handwriting' | 'unknown'

export interface MnMedia {
  /** 二进制内容标识，对应 `GET /notes/{noteid}/content/{contentId}`。 */
  contentId?: string
  /** 媒体哈希，命中 `marginnote4app://markdownimg` 引用时使用。 */
  hash?: string
  kind: MnMediaKind
  mimeType: string
  /** 替代文字，图片读不出来时显示。 */
  alt: string
  /** 图片附带的文字说明，来自 OCR 或引用文本。 */
  caption?: string
}

export interface MnCard {
  id: string
  /** 卡片标题。卡片没有标题时为空串。 */
  title: string
  /**
   * 宿主的显示预览：有标题时是标题，没有标题时取正文首段。
   *
   * 预览不等于标题，界面不用预览充当标题。
   */
  preview?: string
  excerpt: string
  /** 卡片自带的富文本 HTML；存在时优先按 HTML 渲染。 */
  excerptHtml?: string
  /** 卡片上的图片与手写内容。 */
  media?: MnMedia[]
  comments: MnComment[]
  tags: string[]
  page?: number
  documentTitle?: string
  citationKey?: string
  colorIndex?: number
  kind: CardKind
  updatedAt?: number
}

export interface WriterDocument {
  id: string
  title: string
  content: JSONContent
  createdAt: number
  updatedAt: number
  /** 内置演示文稿的版本号，用于在模板更新时替换旧版本。 */
  seedVersion?: number
  /** 卡片最近一次被正文引用的时间，键为卡片标识。 */
  cardUsage?: Record<string, number>
  /** 作者对检索结果的判断，键为卡片标识，值为 1 或 -1。 */
  cardFeedback?: Record<string, 1 | -1>
}

export interface OutlineItem {
  id: string
  level: number
  text: string
  pos: number
}

export type MnConnection =
  | { state: 'mock' }
  | { state: 'connecting' }
  | {
      state: 'connected'
      topicId: string
      topicTitle?: string
      apiVersion?: string
      cardCount: number
      truncated: boolean
      live: boolean
    }
  | { state: 'empty'; reason: string }
  | { state: 'error'; message: string }

export interface MnAdapter {
  readonly kind: 'mock' | 'bridge'
  listCards(query?: string): Promise<MnCard[]>
  getCards(ids: string[]): Promise<MnCard[]>
  getSelectedCardIds(): Promise<string[]>
  focusCard(id: string): void
  locateDocument(id: string): Promise<boolean>
  searchLibrary(query: string): Promise<LibrarySearchResult>
  getConnection(): MnConnection
  subscribeConnection(listener: () => void): () => void
  subscribeChange(listener: () => void): () => void
}

/** 资料库里的卡片命中。 */
export interface LibraryNoteHit {
  id: string
  title: string
  snippet: string
  topicId?: string
  topicTitle?: string
}

/** 资料库里的文献命中。 */
export interface LibraryDocumentHit {
  id: string
  title: string
}

export interface LibrarySearchResult {
  notes: LibraryNoteHit[]
  documents: LibraryDocumentHit[]
  /** 扫描窗口没有覆盖全部结果。 */
  truncated: boolean
}
