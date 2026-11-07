/**
 * 脚注编辑请求。
 *
 * 脚注节点视图位于正文内部，编辑界面放在应用级浮层，
 * 两者通过这个模块交换请求，避免编辑框撑开正文行高。
 */
export interface FootnoteEditorRequest {
  /** 脚注在正文中的序号。 */
  number: number
  content: string
  /** 写回脚注正文。 */
  apply: (content: string) => void
  /** 删除该脚注引用。 */
  remove: () => void
}

let current: FootnoteEditorRequest | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** 打开脚注编辑浮层。 */
export function openFootnoteEditor(request: FootnoteEditorRequest): void {
  current = request
  emit()
}

/** 关闭脚注编辑浮层。 */
export function closeFootnoteEditor(): void {
  if (!current) return
  current = null
  emit()
}

export function subscribeFootnoteEditor(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getFootnoteEditor(): FootnoteEditorRequest | null {
  return current
}
