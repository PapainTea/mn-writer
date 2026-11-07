import type { JSONContent } from '@tiptap/core'

/**
 * 比较两段文稿内容是否相同。
 *
 * 保存时先做比较，内容没有变化就不写盘，也不更新修改时间。
 * 撤销栈回滚到同一内容时同样不会留下保存痕迹。
 */
export function sameContent(left: JSONContent | undefined, right: JSONContent): boolean {
  if (!left) return false
  return JSON.stringify(left) === JSON.stringify(right)
}
