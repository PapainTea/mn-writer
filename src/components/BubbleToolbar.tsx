import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Bold,
  Code2,
  Highlighter,
  Italic,
  Link2,
  Sparkles,
  Strikethrough,
  Underline,
} from 'lucide-react'
import { readWritingContext } from '../lib/context'
import type { AssistRange } from './AssistantPanel'

interface BubbleToolbarProps {
  editor: Editor
  onAssist: (range: AssistRange) => void
}

export function BubbleToolbar({ editor, onAssist }: BubbleToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      strike: current.isActive('strike'),
      highlight: current.isActive('highlight'),
      code: current.isActive('code'),
      link: current.isActive('link'),
    }),
  })

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('链接地址', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  /** 打开段落助手，选区在打开之前先行记录。 */
  const openAssistant = () => {
    const { from, to } = editor.state.selection
    if (from === to) return
    // 语境随选区一起取快照。面板打开以后光标可能移走，
    // 实时读取会把别的段落带进这次生成。
    const context = readWritingContext(editor)
    onAssist({
      from,
      to,
      text: editor.state.doc.textBetween(from, to, '\n'),
      heading: context?.heading,
      previous: context?.previous,
    })
  }

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: current, from, to }) =>
        from !== to && current.state.selection.$from.parent.inlineContent
      }
      options={{ placement: 'top', offset: 8 }}
    >
      <div className="bubble">
        <button
          type="button"
          className={state.bold ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="加粗"
        >
          <Bold size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={state.italic ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体"
        >
          <Italic size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={state.underline ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="下划线"
        >
          <Underline size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={state.strike ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="删除线"
        >
          <Strikethrough size={15} strokeWidth={2} />
        </button>
        <span className="bubble-sep" />
        <button
          type="button"
          className={state.highlight ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="高亮"
        >
          <Highlighter size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={state.code ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="行内代码"
        >
          <Code2 size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={state.link ? 'is-active' : ''}
          onClick={setLink}
          title="链接"
        >
          <Link2 size={15} strokeWidth={2} />
        </button>
        <span className="bubble-sep" />
        <button type="button" onClick={openAssistant} title="段落助手">
          <Sparkles size={15} strokeWidth={1.8} />
        </button>
      </div>
    </BubbleMenu>
  )
}
