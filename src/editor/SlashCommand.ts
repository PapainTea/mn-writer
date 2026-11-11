import { flip, shift, size } from '@floating-ui/dom'
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { createMenu, type SlashItem } from './slashMenu'

export interface SlashCommandOptions {
  onInsertCard: () => void
  onInsertFootnote: () => void
  onInsertCrossRef: () => void
}

/** 菜单的最大高度。 */
const MENU_MAX_HEIGHT = 320
/** 菜单的最小宽度。 */
const MENU_MIN_WIDTH = 208
/** 菜单的最大宽度。 */
const MENU_MAX_WIDTH = 264
/** 菜单四周与面板边缘保留的距离。 */
const MENU_EDGE = 12
/** 菜单与光标行保留的距离。 */
const MENU_GAP = 10

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
      title: '任务列表',
      hint: '待办事项清单',
      keywords: 'task todo checklist 任务 待办 清单',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run()
      },
    },
    {
      title: '表格',
      hint: '三行三列数据表',
      keywords: 'table 表格 数据',
      run: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
      },
    },
    {
      title: '脚注',
      hint: '为当前段落补充说明',
      keywords: 'footnote note 脚注 注释 尾注',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        options.onInsertFootnote()
      },
    },
    {
      title: '交叉引用',
      hint: '引用标题或表格',
      keywords: 'crossref cross reference 交叉引用 引用 参见',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        options.onInsertCrossRef()
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

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      onInsertCard: () => undefined,
      onInsertFootnote: () => undefined,
      onInsertCrossRef: () => undefined,
    }
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
        placement: 'bottom-start',
        offset: { mainAxis: MENU_GAP, crossAxis: 0 },
        // 翻转由下面的中间件统一处理，四周保留同样的安全距离。
        flip: false,
        floatingUi: {
          // 固定定位不受文档滚动影响，菜单不会因为正文滚动而偏移。
          strategy: 'fixed',
          middleware: [
            flip({ padding: MENU_EDGE }),
            // 下方空间不足时翻转到上方，仍放不下时在可视区域内平移。
            shift({ padding: MENU_EDGE, crossAxis: true }),
            // 菜单高度不超过可用空间。
            size({
              padding: MENU_EDGE,
              apply({ availableHeight, availableWidth, elements }) {
                const height = Math.min(MENU_MAX_HEIGHT, Math.max(0, availableHeight))
                const width = Math.min(MENU_MAX_WIDTH, Math.max(0, availableWidth))
                elements.floating.style.maxHeight = height + 'px'
                elements.floating.style.maxWidth = width + 'px'
                elements.floating.style.minWidth = Math.min(MENU_MIN_WIDTH, width) + 'px'
              },
            }),
          ],
        },
      }),
    ]
  },
})
