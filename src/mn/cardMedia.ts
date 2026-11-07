import type { MnMedia, MnMediaKind } from '../types'
import { readMediaRefs } from '../lib/htmlText'

export interface MediaPart {
  index?: number
  contentId?: string
  kind?: string
  mimeType?: string
  text?: string
  ocrText?: string
  excerpt?: boolean
  /** 宿主判定该条目可以渲染成二进制内容。 */
  renderable?: boolean
  /** 二进制内容的取回路径，文字条目没有该字段。 */
  contentPath?: string
  field?: string
  fieldLabel?: string
}

export interface MediaRef {
  hash: string
  mimeType: string
}

export interface CardMedia {
  /** 卡片上的图片与手写内容。 */
  items: MnMedia[]
  /** 卡片正文里的图片引用，按哈希索引。 */
  byHash: Map<string, MnMedia>
}

/** 判断一个类型是否是图片。 */
export function isImageMime(mimeType: string | undefined): boolean {
  return String(mimeType ?? '').toLowerCase().startsWith('image/')
}

function readMediaKind(part: MediaPart): MnMediaKind {
  const kind = String(part.kind ?? '').toLowerCase()
  if (/ink|draw|paint|handwrit|sketch|笔迹|手写/.test(kind)) return 'handwriting'
  if (/image|pic|photo|figure|图|画/.test(kind)) return 'image'
  return 'unknown'
}

/**
 * 判断条目是不是二进制内容。
 *
 * 标题、正文与富文本条目同样带有 `contentId`，但都没有 `mimeType`。
 * 缺省补成图片类型会让这些文字条目变成读不出来的图片，因此只认正向标记：
 * 图片类型、宿主的可渲染标记、取回路径，或者已知的图片类条目。
 */
function isBinaryPart(part: MediaPart): boolean {
  if (part.mimeType) return isImageMime(part.mimeType)
  if (readMediaKind(part) === 'unknown') return false
  return part.renderable === true || Boolean(part.contentPath)
}

function readAlt(part: MediaPart, kind: MnMediaKind): string {
  const label = String(part.fieldLabel ?? part.field ?? '').trim()
  if (label) return label
  if (kind === 'handwriting') return '手写内容'
  return '图片'
}

/**
 * 汇总卡片上的二进制内容。
 *
 * 二进制项来自批量取卡接口的 `parts` 字段；卡片正文里的图片引用按哈希记录，
 * 与 `parts` 对应不上时单独成项，由原生侧按哈希取回。
 */
export function collectMedia(parts: MediaPart[] | undefined, texts: string[]): CardMedia {
  const items: MnMedia[] = []
  const byHash = new Map<string, MnMedia>()
  const seenContentIds = new Set<string>()
  const source = parts ?? []

  // 图片地址记在文字条目里，二进制条目单独成项，两者靠 `index` 对应。
  const refsByIndex = new Map<number, MediaRef[]>()
  for (const part of source) {
    if (isBinaryPart(part)) continue
    const refs = readMediaRefs(`${part.text ?? ''}\n${part.ocrText ?? ''}`)
    if (!refs.length) continue
    const index = part.index ?? Number.NaN
    if (!Number.isFinite(index)) continue
    const queue = refsByIndex.get(index)
    if (queue) queue.push(...refs)
    else refsByIndex.set(index, [...refs])
  }

  const takeRef = (part: MediaPart): MediaRef | undefined => {
    const index = part.index ?? Number.NaN
    if (!Number.isFinite(index)) return undefined
    const queue = refsByIndex.get(index)
    if (!queue?.length) return undefined
    return queue.shift()
  }

  for (const part of source) {
    if (!part.contentId || seenContentIds.has(part.contentId)) continue
    if (!isBinaryPart(part)) continue
    seenContentIds.add(part.contentId)
    const kind = readMediaKind(part)
    const mimeType = part.mimeType || 'image/png'
    const ownRefs = readMediaRefs(`${part.text ?? ''}\n${part.ocrText ?? ''}`)
    const media: MnMedia = {
      contentId: part.contentId,
      hash: ownRefs[0]?.hash ?? takeRef(part)?.hash,
      kind,
      mimeType,
      alt: readAlt(part, kind),
      caption: part.ocrText?.trim() || undefined,
    }
    items.push(media)
    for (const ref of ownRefs) {
      if (!byHash.has(ref.hash)) byHash.set(ref.hash, media)
    }
    if (media.hash && !byHash.has(media.hash)) byHash.set(media.hash, media)
  }

  for (const text of texts) {
    for (const ref of readMediaRefs(text)) {
      if (byHash.has(ref.hash)) continue
      const media: MnMedia = {
        hash: ref.hash,
        kind: 'image',
        mimeType: ref.mimeType,
        alt: '图片',
      }
      items.push(media)
      byHash.set(ref.hash, media)
    }
  }

  return { items, byHash }
}
