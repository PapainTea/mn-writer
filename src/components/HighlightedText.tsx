/**
 * 命中词文本。
 *
 * 片段里的命中词单独着色，作者可以直接看出卡片与当前段落的关联点。
 */

import { splitByTerms } from '../lib/highlight'

interface HighlightedTextProps {
  text: string
  terms: string[]
}

export function HighlightedText({ text, terms }: HighlightedTextProps) {
  const spans = splitByTerms(text, terms)
  return (
    <>
      {spans.map((span, index) =>
        span.hit ? (
          <mark className="evidence-mark" key={index}>
            {span.text}
          </mark>
        ) : (
          <span key={index}>{span.text}</span>
        ),
      )}
    </>
  )
}
