import type { JSONContent } from '@tiptap/core'

export type CardKind = 'excerpt' | 'note' | 'literature'

export type CommentFormat = 'text' | 'markdown' | 'html' | 'rich'

export interface MnComment {
  text: string
  format: CommentFormat
}

export interface MnCard {
  id: string
  title: string
  excerpt: string
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
  getSelectedCardId(): Promise<string | null>
  focusCard(id: string): void
  getConnection(): MnConnection
  subscribeConnection(listener: () => void): () => void
  subscribeChange(listener: () => void): () => void
}
