/**
 * 空状态条目。
 *
 * 条目由一个图标与一行文字组成，
 * 用于说明面板里此刻没有内容，或者某个过程正在进行。
 * 条目只描述状态，不解释操作。
 */

import { Inbox, LoaderCircle, Quote, SearchX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type EmptyStateKind = 'empty' | 'loading' | 'failed' | 'pending'

interface EmptyStateProps {
  /** 状态。 */
  kind?: EmptyStateKind
  /** 状态说明。 */
  children: ReactNode
  /** 追加的类名。 */
  className?: string
}

/** 各状态对应的图标。 */
const KIND_ICONS: Record<EmptyStateKind, LucideIcon> = {
  empty: Inbox,
  loading: LoaderCircle,
  failed: SearchX,
  pending: Quote,
}

export function EmptyState({ kind = 'empty', children, className }: EmptyStateProps) {
  const Icon = KIND_ICONS[kind]
  return (
    <div className={'empty-state' + (className ? ' ' + className : '')} data-kind={kind}>
      <Icon size={13} strokeWidth={1.8} className="empty-state-icon" />
      <span className="empty-state-text">{children}</span>
    </div>
  )
}
