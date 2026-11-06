import { Extension, type Editor, type Range } from '@tiptap/core'
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from '@tiptap/suggestion'

export interface SlashCommandOptions {
  onInsertCard: () => void
}

interface SlashItem {
  title: string
  hint: string
  keywords: string
  run: (context: { editor: Editor; range: Range }) => void
}

function buildItems(options: SlashCommandOptions): SlashItem[] {
  return [
    {
      title: '插入卡片',
      hint: '从 MarginNote 选择一张卡片',
      keywords: 'card mnmargin 卡片 引用',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        options.onInsertCard()
      },
    },
    {
      title: '一级标题',
      hint: '章节标题',
      keywords: 'h1 heading 标题',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
      },
    },
    {
      title: '二级标题',
      hint: '小节标题',
      keywords: 'h2 heading 标题',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
      },
    },
    {
      title: '项目列表',
      hint: '无序清单',
      keywords: 'bullet list 列表',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
    },
    {
      title: '有序列表',
      hint: '编号清单',
      keywords: 'ordered list 列表 编号',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
    },
    {
      title: '引用',
      hint: '引用段落',
      keywords: 'quote blockquote 引用',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
    },
    {
      title: '分隔线',
      hint: '分隔章节',
      keywords: 'hr divider 分隔线',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run()
      },
    },
  ]
}

function filterItems(items: SlashItem[], query: string): SlashItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) =>
    `${item.title} ${item.hint} ${item.keywords}`.toLowerCase().includes(q),
  )
}

function createMenu() {
  let element: HTMLDivElement | null = null
  let unmount: (() => void) | null = null
  let items: SlashItem[] = []
  let selected = 0
  let command: ((item: SlashItem) => void) | null = null

  const paint = () => {
    if (!element) return
    element.replaceChildren()
    items.forEach((item, index) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.className = `slash-item${index === selected ? ' is-active' : ''}`
      row.setAttribute('role', 'option')
      row.setAttribute('aria-selected', String(index === selected))

      const title = document.createElement('span')
      title.className = 'slash-item-title'
      title.textContent = item.title

      const hint = document.createElement('span')
      hint.className = 'slash-item-hint'
      hint.textContent = item.hint

      row.append(title, hint)
      row.addEventListener('mousedown', (event) => {
        event.preventDefault()
        command?.(item)
      })
      element?.appendChild(row)
    })
    if (items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'slash-empty'
      empty.textContent = '没有匹配的命令'
      element.appendChild(empty)
    }
    element.querySelector('.slash-item.is-active')?.scrollIntoView({ block: 'nearest' })
  }

  return {
    onStart(props: SuggestionProps<SlashItem>) {
      element = document.createElement('div')
      element.className = 'slash-menu'
      element.setAttribute('role', 'listbox')
      unmount = props.mount(element)
      items = props.items
      selected = 0
      command = props.command
      paint()
    },
    onUpdate(props: SuggestionProps<SlashItem>) {
      items = props.items
      selected = 0
      command = props.command
      paint()
    },
    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === 'ArrowDown') {
        selected = Math.min(selected + 1, Math.max(items.length - 1, 0))
        paint()
        return true
      }
      if (props.event.key === 'ArrowUp') {
        selected = Math.max(selected - 1, 0)
        paint()
        return true
      }
      if (props.event.key === 'Enter' || props.event.key === 'Tab') {
        const item = items[selected]
        if (item) {
          command?.(item)
          return true
        }
        return false
      }
      return false
    },
    onExit() {
      unmount?.()
      unmount = null
      element = null
      items = []
    },
  }
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return { onInsertCard: () => undefined }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        startOfLine: true,
        allowSpaces: false,
        command: ({ editor, range, props }) => props.run({ editor, range }),
        items: ({ query }) => filterItems(buildItems(options), query),
        render: createMenu,
      }),
    ]
  },
})
