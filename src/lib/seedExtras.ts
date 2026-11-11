import type { JSONContent } from '@tiptap/core'
import type { MnCard } from '../types'

export const demoCard: MnCard = {
  id: 'mn-demo-guide-001',
  title: '摘录与判断应当分开记录',
  preview: '摘录与判断应当分开记录',
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

export const sectionExtras: Record<string, JSONContent[]> = {
  '一、插入卡片': [
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
  ],
  '七、表格与任务列表': [
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
  ],
  '八、脚注': [
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
  ],
  '九、交叉引用': [
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
  ],
}
