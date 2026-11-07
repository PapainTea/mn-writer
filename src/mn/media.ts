import type { MnMedia } from '../types'
import { callNative, nativeBridgeAvailable } from './native'

const BRIDGE_BASE = '/bridge/v1'
const MEDIA_TIMEOUT = 15_000

/** 已经取回的媒体地址，按卡片与内容标识缓存，避免重复下载。 */
const urlCache = new Map<string, string>()
const failedKeys = new Set<string>()

export function mediaKey(noteId: string, media: MnMedia): string {
  if (media.contentId) return `${noteId}:${media.contentId}`
  if (media.hash) return `hash:${media.hash}`
  return ''
}

async function fetchContentUrl(noteId: string, contentId: string): Promise<string | null> {
  if (typeof fetch !== 'function') return null
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), MEDIA_TIMEOUT)
  try {
    const response = await fetch(
      `${BRIDGE_BASE}/notes/${encodeURIComponent(noteId)}/content/${encodeURIComponent(contentId)}`,
      { signal: controller.signal },
    )
    if (!response.ok) return null
    const blob = await response.blob()
    if (!blob.size) return null
    return URL.createObjectURL(blob)
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

async function fetchHashUrl(media: MnMedia): Promise<string | null> {
  if (!nativeBridgeAvailable() || !media.hash) return null
  try {
    const result = await callNative<{ base64?: string; mimeType?: string }>(
      'media:read',
      { hash: media.hash, mimeType: media.mimeType },
      MEDIA_TIMEOUT,
    )
    if (!result?.base64) return null
    const mimeType = result.mimeType || media.mimeType || 'image/png'
    return `data:${mimeType};base64,${result.base64}`
  } catch {
    return null
  }
}

/**
 * 取回一张卡片上的一项媒体内容，返回可用的地址。
 *
 * 优先走卡片内容接口；正文里的图片引用按哈希记录，接口取不到时由原生侧按哈希取回。
 */
export async function resolveMediaUrl(noteId: string, media: MnMedia): Promise<string | null> {
  const key = mediaKey(noteId, media)
  if (!key) return null
  const cached = urlCache.get(key)
  if (cached) return cached
  if (failedKeys.has(key)) return null

  const url = media.contentId
    ? (await fetchContentUrl(noteId, media.contentId)) ??
      (await fetchHashUrl({ ...media, hash: media.hash ?? media.contentId }))
    : await fetchHashUrl(media)
  if (!url) {
    failedKeys.add(key)
    return null
  }
  urlCache.set(key, url)
  return url
}

/** 批量取回一张卡片上的全部媒体内容。 */
export async function resolveCardMedia(
  noteId: string,
  mediaList: MnMedia[],
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>()
  await Promise.all(
    mediaList.map(async (media) => {
      const url = await resolveMediaUrl(noteId, media)
      if (url) resolved.set(mediaKey(noteId, media), url)
    }),
  )
  return resolved
}

/** 释放已经取回的媒体地址。 */
export function releaseMediaUrls(): void {
  for (const url of urlCache.values()) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  }
  urlCache.clear()
  failedKeys.clear()
}
