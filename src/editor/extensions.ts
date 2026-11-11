import CharacterCount from '@tiptap/extension-character-count'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { CardBlock } from './CardBlock'
import { Citation } from './citationPlugin'
import { CrossReference } from './crossRef'
import { Evidence } from './evidencePlugin'
import { FootnoteReference } from './footnote'
import { OutlineFlash } from './OutlineFlash'
import { SlashCommand } from './SlashCommand'

export interface ExtensionOptions {
  onInsertCard: () => void
  onInsertFootnote: () => void
  onInsertCrossRef: () => void
}

export function createExtensions(options: ExtensionOptions) {
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
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({
      table: { resizable: true, lastColumnResizable: false },
    }),
    FootnoteReference,
    CrossReference,
    CardBlock,
    Evidence,
    Citation,
    OutlineFlash,
    SlashCommand.configure({
      onInsertCard: options.onInsertCard,
      onInsertFootnote: options.onInsertFootnote,
      onInsertCrossRef: options.onInsertCrossRef,
    }),
  ]
}
