import type { JSONContent } from '@tiptap/core'
import type { MnCard, WriterDocument } from '../types'

/** 内置演示文稿的版本号，模板文案调整后递增，用于替换用户本机上的旧版本。 */
export const SEED_VERSION = 2

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
      '卡片进入正文后保留标题、摘录、批注、页码与引用键。原文仍然留在 MarginNote 的文档与脑图之中，正文仅保存一份可随时更新的引用。',
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
    heading: '七、导出与备份',
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
    ...demoSections.slice(1).flatMap(sectionNodes),
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
