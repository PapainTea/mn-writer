import { useEffect, useRef, useState } from 'react'
import { mediaKey, resolveCardMedia } from '../mn/media'
import type { MnMedia } from '../types'

export interface CardMediaState {
  /** 按媒体标识索引的图片地址。 */
  urls: Map<string, string>
  /** 按图片哈希索引的图片地址，用于替换卡片正文里的图片地址。 */
  hashUrls: Map<string, string>
  /** 图片还在读取。 */
  pending: boolean
}

interface ResolvedState {
  signature: string
  urls: Map<string, string>
  hashUrls: Map<string, string>
}

const EMPTY_STATE: CardMediaState = {
  urls: new Map(),
  hashUrls: new Map(),
  pending: false,
}

/** 读取一张卡片上的图片与手写内容。 */
export function useCardMedia(noteId: string, media: MnMedia[]): CardMediaState {
  const [state, setState] = useState<ResolvedState | null>(null)
  const mediaRef = useRef(media)
  const signature = media.map((item) => mediaKey(noteId, item)).join('|')

  useEffect(() => {
    mediaRef.current = media
  }, [media])

  useEffect(() => {
    const list = mediaRef.current
    if (!list.length) return
    let active = true
    void resolveCardMedia(noteId, list).then((resolved) => {
      if (!active) return
      const hashUrls = new Map<string, string>()
      for (const item of mediaRef.current) {
        const url = resolved.get(mediaKey(noteId, item))
        if (url && item.hash) hashUrls.set(item.hash, url)
      }
      setState({ signature, urls: resolved, hashUrls })
    })
    return () => {
      active = false
    }
  }, [noteId, signature])

  if (!signature) return EMPTY_STATE
  if (state && state.signature === signature) {
    return { urls: state.urls, hashUrls: state.hashUrls, pending: false }
  }
  return { urls: EMPTY_STATE.urls, hashUrls: EMPTY_STATE.hashUrls, pending: true }
}
