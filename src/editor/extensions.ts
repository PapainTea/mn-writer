import CharacterCount from '@tiptap/extension-character-count'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { CardBlock } from './CardBlock'
import { OutlineFlash } from './OutlineFlash'
import { SlashCommand } from './SlashCommand'

export function createExtensions(onInsertCard: () => void) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      },
    }),
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === 'heading' ? '标题' : '开始写作，输入 / 插入内容',
    }),
    CharacterCount.configure({ limit: 300000 }),
    Highlight,
    CardBlock,
    OutlineFlash,
    SlashCommand.configure({ onInsertCard }),
  ]
}
