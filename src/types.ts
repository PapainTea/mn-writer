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
  title: string
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
  getConnection(): MnConnection
  subscribeConnection(listener: () => void): () => void
  subscribeChange(listener: () => void): () => void
}
