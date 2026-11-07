import { useState } from 'react'
import { mediaKey } from '../mn/media'
import type { MnMedia } from '../types'

interface CardMediaProps {
  noteId: string
  media: MnMedia[]
  urls: Map<string, string>
  pending: boolean
}

/** 展示卡片上的图片与手写内容。 */
export function CardMedia({ noteId, media, urls, pending }: CardMediaProps) {
  const [broken, setBroken] = useState<string[]>([])
  if (!media.length) return null
  return (
    <div className="mn-card-media">
      {media.map((item) => {
        const key = mediaKey(noteId, item)
        const url = urls.get(key)
        const failed = !url || broken.includes(key)
        return (
          <figure className="mn-card-media-item" key={key}>
            {!failed ? (
              <img
                className="mn-card-media-image"
                src={url}
                alt={item.alt}
                onError={() => setBroken((previous) => [...previous, key])}
              />
            ) : (
              <div className="mn-card-media-missing">
                {pending ? '正在读取图片…' : `${item.alt}读取失败`}
              </div>
            )}
            {item.caption && <figcaption className="mn-card-media-caption">{item.caption}</figcaption>}
          </figure>
        )
      })}
    </div>
  )
}
