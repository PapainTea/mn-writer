import type { Editor, JSONContent } from '@tiptap/core'

/**
 * 装载文稿内容时使用的标记。
 *
 * 该标记随事务一起提交，用于识别「结构替换」类的事务。
 */
export const DOCUMENT_LOAD_META = 'mn-writer-document-load'

/**
 * 载入文稿正文。
 *
 * 装载会整体替换正文，属于结构变化，不进入撤销栈。
 * 撤销操作因此只作用于当前文稿里的编辑，不会把上一份文稿的内容写回当前文稿。
 */
export function loadDocumentContent(editor: Editor, content: JSONContent): boolean {
  const node = editor.schema.nodeFromJSON(content)
  const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, node.content)
  tr.setMeta(DOCUMENT_LOAD_META, true)
  tr.setMeta('addToHistory', false)
  editor.view.dispatch(tr)
  return true
}

/**
 * 判断事务是否来自文稿装载。
 *
 * 自动保存依赖该判断，避免把结构替换误当成用户编辑。
 */
export function isDocumentLoad(transaction: { getMeta: (key: string) => unknown }): boolean {
  return transaction.getMeta(DOCUMENT_LOAD_META) === true
}
