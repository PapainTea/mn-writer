import type { JSONContent } from '@tiptap/core'
import type { MnCard, WriterDocument } from '../types'

/** 内置演示文稿的版本号，模板文案调整后递增，用于替换用户本机上的旧版本。 */
export const SEED_VERSION = 4

const demoCard: MnCard = {
  id: 'mn-demo-001',
  title: '摘录与判断应当分开记录',
  excerpt:
    '摘录阶段仅记录原文，判断留到整理阶段完成。摘录与判断混合在同一张卡片中，后续检索会失去焦点。',
  comments: [
    {
      text: '该批注可以作为下一节的论据。写作时先引用原文，再补充作者判断。',
      format: 'text',
    },
  ],
  tags: ['精读/方法', 'topic/卡片笔记', 'status/已精读'],
  page: 18,
  documentTitle: '卡片笔记写作法',
  citationKey: 'ahrens2017smart',
  colorIndex: 0,
  kind: 'excerpt',
}

interface DemoSection {
  heading: string
  paragraphs: string[]
}

const demoSections: DemoSection[] = [
  {
    heading: '一、插入卡片',
    paragraphs: [
      '光标置于空行后输入斜杠，命令菜单会列出可插入的卡片。也可点击右上角的「插入卡片」按钮，或从左侧列表将卡片拖入正文。',
      '卡片进入正文后保留标题、摘录、批注、图片、手写笔迹、页码与引用键。原文仍然留在 MarginNote 的文档与脑图之中，正文仅保存一份可随时更新的引用。',
      '卡片右上角的复制按钮会把摘录与批注写入剪贴板，粘贴到其他程序时保留段落格式。',
    ],
  },
  {
    heading: '二、卡片定位',
    paragraphs: [
      '双击正文中的卡片会返回 MarginNote 中对应的卡片。双击按钮或菜单不会触发定位，选中文本后的双击也不会触发，以免与选词操作冲突。',
    ],
  },
  {
    heading: '三、选中卡片置顶',
    paragraphs: [
      '在脑图中选中一张或多张卡片，左侧列表与插入面板会将这些卡片置顶，并标记「当前」。多张卡片按原有顺序排列，便于连续插入同一组材料。',
    ],
  },
  {
    heading: '四、刷新卡片内容',
    paragraphs: [
      '在 MarginNote 中补充批注或修改摘录后，正文中的卡片仍保留旧内容。单张卡片可在菜单中点击「刷新卡片内容」。',
      '整篇文稿的材料均有改动时，可点击标题栏的刷新按钮。全部卡片在同一事务中更新，图标在执行期间旋转，完成后提示「已刷新所有卡片内容」。刷新失败时会说明成功与失败的数量。同一张卡片在正文出现多次时，各处同时更新。',
    ],
  },
  {
    heading: '五、转为文本',
    paragraphs: [
      '成稿阶段，卡片容器会打断行文。卡片菜单中的「转为文本」会取消卡片引用，仅保留标题、摘录与批注，来源、页码、标签与引用键一并移除。',
      '转换在同一事务中完成，可通过 Cmd+Z 撤销。确认不再需要该卡片时，可使用「从正文移除」直接删除。',
    ],
  },
  {
    heading: '六、专注模式与主题',
    paragraphs: [
      '专注模式隐藏侧栏与顶栏，仅保留正文，按 Esc 退出，退出后侧栏与顶栏恢复原状。',
      '卡片视图可在舒展与紧凑之间切换。主题支持跟随系统、浅色与深色，选择结果保存在本机。',
    ],
  },
  {
    heading: '七、表格与任务列表',
    paragraphs: [
      '输入斜杠后选择「表格」，正文插入三行三列的数据表。表格支持拖动列宽，单元格内可以继续使用加粗、链接与脚注。',
      '输入斜杠后选择「任务列表」，正文插入可勾选的待办事项。按回车继续添加下一项，按 Tab 缩进形成子任务。',
    ],
  },
  {
    heading: '八、脚注',
    paragraphs: [
      '输入斜杠后选择「脚注」，正文插入一个带编号的脚注引用。点击编号以后，面板底部出现编辑浮层，填写内容并保存即可。',
      '脚注正文保存在引用节点内部，复制 Markdown 时输出为 `[^1]` 引用与文末定义，导出 JSON 时随文稿一起保存。',
    ],
  },
  {
    heading: '九、交叉引用',
    paragraphs: [
      '输入斜杠后选择「交叉引用」，面板按标题与表格分区列出可引用的目标。方向键选择，回车插入，点击正文中的引用可以跳转到目标位置。',
      '标题按出现顺序编号，表格单独编号。目标被删除以后，引用仍然保留原文，点击时提示目标已不存在。',
    ],
  },
  {
    heading: '十、字数统计',
    paragraphs: [
      '顶栏显示当前字数。点击字数打开统计面板，面板列出字符数、中文字符、外文单词、段落、行、页、卡片、脚注、表格与图片。',
      '字数口径与 Word 接近：中文按字计，外文按词计。行数与页数按每行 38 个字符、每页 36 行估算。',
    ],
  },
  {
    heading: '十一、导出与备份',
    paragraphs: [
      '导出菜单可复制 Markdown、下载 Markdown，也可下载 JSON 备份。Markdown 便于继续排版，JSON 备份保留文稿结构与卡片快照。',
      '更换设备或需要恢复时，可在同一菜单中导入 JSON 备份。',
    ],
  },
]

function sectionNodes(section: DemoSection): JSONContent[] {
  return [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: section.heading }],
    },
    ...section.paragraphs.map((paragraph) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: paragraph }],
    })),
  ]
}

const demoContent: JSONContent = {
  type: 'doc',
  content: [
    ...sectionNodes(demoSections[0] as DemoSection),
    {
      type: 'cardBlock',
      attrs: { cardId: demoCard.id, snapshot: demoCard },
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '该卡片即插入后的形态。双击卡片主体可返回 MarginNote 中对应的卡片，卡片右上角的更多菜单提供刷新、转为文本与移除操作。',
        },
      ],
    },
    ...demoSections
      .slice(1, 6)
      .flatMap(sectionNodes),
    ...sectionNodes(demoSections[6] as DemoSection),
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '核对第四节引用的样本量' }],
            },
          ],
        },
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '补齐方法部分的实验条件' }],
            },
          ],
        },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableHeader',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '研究' }] }],
            },
            {
              type: 'tableHeader',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '样本量' }] }],
            },
            {
              type: 'tableHeader',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '效应量' }] }],
            },
          ],
        },
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '公共物品博弈' }] }],
            },
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '1204' }] }],
            },
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '0.31' }] }],
            },
          ],
        },
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '元分析' }] }],
            },
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '47 项研究' }] }],
            },
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '0.31' }] }],
            },
          ],
        },
      ],
    },
    ...sectionNodes(demoSections[7] as DemoSection),
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '示例：脚注引用显示为编号，点击编号即可编辑正文。',
        },
        {
          type: 'footnoteReference',
          attrs: { content: '脚注正文保存在引用节点内部，导出时不会丢失。' },
        },
      ],
    },
    ...sectionNodes(demoSections[8] as DemoSection),
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '示例：这一句引用了上文的数据表，' },
        {
          type: 'crossReference',
          attrs: { targetId: 'table-1', kind: 'table', label: '表 1' },
        },
        { type: 'text', text: '，点击即可回到表格位置。' },
      ],
    },
    ...sectionNodes(demoSections[9] as DemoSection),
    ...sectionNodes(demoSections[10] as DemoSection),
  ],
}

export function createSeedDocument(): WriterDocument {
  const now = Date.now()
  return {
    id: 'doc-welcome',
    title: '写作台使用指南',
    content: demoContent,
    createdAt: now,
    updatedAt: now,
    seedVersion: SEED_VERSION,
  }
}
