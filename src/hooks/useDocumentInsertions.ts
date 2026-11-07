import type { Editor } from '@tiptap/core'
import { useCallback, useMemo, useState } from 'react'
import { collectCrossRefTargets, type CrossRefTarget } from '../lib/crossRef'

/**
 * 正文插入类操作。
 *
 * 脚注、交叉引用与卡片的插入都收拢在这里，
 * 避免主组件承担过多细节。
 */
export function useDocumentInsertions(
  editor: Editor | null,
  onToast: (message: string) => void,
) {
  const [crossRefOpen, setCrossRefOpen] = useState(false)
  /** 斜杠菜单请求插入脚注，计数变化时触发插入。 */
  const [footnoteRequest, setFootnoteRequest] = useState(0)

  /** 在光标处插入脚注引用，点击引用后可填写脚注正文。 */
  const insertFootnote = useCallback(() => {
    if (!editor) return
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'footnoteReference',
        attrs: { content: '' },
      })
      .run()
    onToast('已插入脚注，点击编号填写内容')
  }, [editor, onToast])

  /** 请求插入脚注，由斜杠菜单调用。 */
  const requestFootnote = useCallback(() => {
    setFootnoteRequest((value) => value + 1)
  }, [])

  /** 在光标处插入交叉引用。 */
  const insertCrossRef = useCallback(
    (target: CrossRefTarget) => {
      if (!editor) return
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'crossReference',
          attrs: { targetId: target.id, kind: target.kind, label: target.label },
        })
        .run()
      onToast(`已插入引用「${target.label}」`)
    },
    [editor, onToast],
  )

  return {
    crossRefOpen,
    setCrossRefOpen,
    footnoteRequest,
    insertFootnote,
    requestFootnote,
    insertCrossRef,
  }
}

/** 收集文稿里可被交叉引用的目标。 */
export function useCrossRefTargets(doc: unknown): CrossRefTarget[] {
  return useMemo(() => {
    if (!doc || typeof doc !== 'object') return []
    return collectCrossRefTargets(doc as Parameters<typeof collectCrossRefTargets>[0])
  }, [doc])
}
