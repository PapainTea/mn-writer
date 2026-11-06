import type { JSONContent } from '@tiptap/core'
import type { MnCard, WriterDocument } from '../types'

const demoCard: MnCard = {
  id: 'mn-demo-001',
  title: '社会规范通过第二方惩罚维持合作',
  excerpt:
    '当合作者的贡献可以被同伴观察并评价时，规范违反者遭遇的惩罚显著增加，合作率在十轮之后仍保持在 68% 左右。',
  comments: [
    {
      text: '作者把规范拆成可观察性与同伴评价两个机制，实验设计干净。需要核对第 4 节的稳健性检验。',
      format: 'text',
    },
  ],
  tags: ['精读/结论', 'topic/合作', 'status/已精读'],
  page: 12,
  documentTitle: '规范、激励与合作行为',
  citationKey: 'wang2024norms',
  colorIndex: 0,
  kind: 'excerpt',
}

const demoContent: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '从阅读到写作' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '这是一份演示文稿。把 MarginNote 卡片插入正文，卡片会保留标题、摘录、页码与引用键，原文仍然留在阅读现场。',
        },
      ],
    },
    {
      type: 'cardBlock',
      attrs: { cardId: demoCard.id, snapshot: demoCard },
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '在空行输入 ',
        },
        { type: 'text', marks: [{ type: 'code' }], text: '/' },
        {
          type: 'text',
          text: ' 打开命令菜单，也可以点击右上角的「插入卡片」，或从左侧卡片列表把卡片拖进正文。',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '今天的写作计划' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '把已精读的卡片归入「规范与合作」一节。' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '为每张卡片补一句自己的判断，不重复原文。' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '把成稿导出为 Markdown，交给 Typst 排版。' }],
            },
          ],
        },
      ],
    },
  ],
}

export function createSeedDocument(): WriterDocument {
  const now = Date.now()
  return {
    id: 'doc-welcome',
    title: '科研阅读笔记',
    content: demoContent,
    createdAt: now,
    updatedAt: now,
  }
}
