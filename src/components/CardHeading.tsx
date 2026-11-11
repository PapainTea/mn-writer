/**
 * 卡片标题位。
 *
 * 卡片有标题时显示标题，没有标题时显示文献名。
 * 预览与正文首段都不充当标题。
 * 卡片类型只在正文里展开的卡片上显示，折叠状态一律不显示。
 */

import type { CardSummary } from '../lib/cardSummary'

interface CardHeadingProps {
  summary: CardSummary
  /** 有标题时使用的类名。 */
  className?: string
}

export function CardHeading({ summary, className }: CardHeadingProps) {
  if (summary.title) return <span className={className}>{summary.title}</span>
  if (summary.documentTitle) return <span className={className}>{summary.documentTitle}</span>
  return null
}
