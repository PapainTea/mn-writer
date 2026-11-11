import type { MnAdapter, MnCard, MnConnection } from '../types'
import { filterCards } from '../lib/cardSearch'

const rawCards: MnCard[] = [
  {
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
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'mn-demo-002',
    title: 'Observability raises contributions only when reputations are public',
    excerpt:
      'In the public-reputation condition, average contributions rose from 41% to 63% of the endowment; in the anonymous condition the effect disappeared.',
    comments: [
      {
        text: 'The interaction is the key result. Replication with a larger sample would strengthen the claim.',
        format: 'text',
      },
    ],
    tags: ['精读/证据', 'method/实验', 'topic/声誉'],
    page: 8,
    documentTitle: 'Observability in Public Goods Games',
    citationKey: 'smith2023observability',
    colorIndex: 2,
    kind: 'excerpt',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    id: 'mn-demo-003',
    title: '元分析显示效应量随样本增大而衰减',
    excerpt:
      '纳入 47 项研究的随机效应模型给出的合并效应量为 0.31，但小样本研究的效应量系统性高于大样本研究。',
    comments: [
      {
        text: '与主实验的效应量方向一致。引用时需要同时说明异质性与发表偏倚。',
        format: 'text',
      },
      {
        text: '**待办**\n\n- 核对异质性检验\n- 检查发表偏倚的 Egger 回归\n- 补充小样本研究的排除标准',
        format: 'markdown',
      },
    ],
    tags: ['整理/证据', 'method/元分析'],
    page: 31,
    documentTitle: '合作行为的元分析',
    citationKey: 'liu2022meta',
    colorIndex: 3,
    kind: 'excerpt',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  },
  {
    id: 'mn-demo-004',
    title: '研究局限：样本只覆盖城市大学生',
    excerpt:
      '全部被试来自三所城市高校，年龄集中在 19 至 23 岁，结论能否推广到其他人群仍不清楚。',
    comments: [
      {
        text: '写作时放在讨论部分，与外部效度一起处理。',
        format: 'text',
      },
    ],
    tags: ['精读/局限', 'topic/外部效度'],
    page: 27,
    documentTitle: '规范、激励与合作行为',
    citationKey: 'wang2024norms',
    colorIndex: 4,
    kind: 'excerpt',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: 'mn-demo-005',
    title: '概念：合作行为',
    excerpt:
      '合作行为指个体承担个人成本，使群体其他成员获得收益的行为，本文以公共物品博弈中的贡献额度量。',
    comments: [
      {
        text: '定义里把个体成本与群体收益分开度量，写作时沿用这一区分。',
        format: 'text',
      },
    ],
    tags: ['概念/定义', 'topic/合作'],
    page: 3,
    documentTitle: '规范、激励与合作行为',
    citationKey: 'wang2024norms',
    colorIndex: 1,
    kind: 'literature',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
  },
  {
    id: 'mn-demo-006',
    title: 'Methods: pre-registered public goods game with 1,204 participants',
    excerpt:
      'Participants played ten rounds in groups of four. The experiment crossed observability with reputation and used a pre-registered analysis plan.',
    comments: [
      {
        text: 'Sample size and design are strong. Check the exclusion rules in Appendix B.',
        format: 'text',
      },
      {
        text: '<p>Exclusion rules: <strong>Appendix B</strong>, section 2.3.</p><ul><li>Pre-registered criteria</li><li>Drop-out handling</li></ul>',
        format: 'html',
      },
    ],
    tags: ['精读/方法', 'method/实验设计'],
    page: 9,
    documentTitle: 'Observability in Public Goods Games',
    citationKey: 'smith2023observability',
    colorIndex: 5,
    kind: 'excerpt',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
  },
  {
    id: 'mn-demo-007',
    title: 'Discussion: cultural boundary conditions',
    excerpt:
      'The authors argue that public reputation matters more in collectivist contexts, but the design does not test culture directly.',
    comments: [
      {
        text: 'A useful gap for the literature review. Pair with the meta-analysis finding.',
        format: 'text',
      },
    ],
    tags: ['精读/讨论', 'topic/边界条件'],
    page: 22,
    documentTitle: 'Observability in Public Goods Games',
    citationKey: 'smith2023observability',
    colorIndex: 6,
    kind: 'excerpt',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: 'mn-demo-008',
    title: '文献卡：规范、激励与合作行为',
    excerpt:
      '王璐、陈明（2024）。《规范、激励与合作行为》。实验经济学研究，采用公共物品博弈与同伴评价设计。',
    comments: [
      {
        text: '中文专著，作者为王璐、陈明，2024 年出版。引用时用 `wang2024norms` 作为引用键。',
        format: 'markdown',
      },
    ],
    tags: ['文献', 'status/已精读'],
    documentTitle: '规范、激励与合作行为',
    citationKey: 'wang2024norms',
    colorIndex: 7,
    kind: 'literature',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
  {
    id: 'mn-demo-010',
    title: '大模型幻觉的表现特征、效应争议及潜在价值',
    excerpt:
      'by 喻国明, 金丽萍, 苏芳(2026) 期刊文章 original-container-title: Journalism & Communication Review foundation: 教育部哲学社会科学研究重大专项项目(2025JZDZ014)； album: 信息科技 CLC: G206 dbcode: CJFQ dbname: CJFDAUTO filename: WHDS202601003 publicationTag: 北大核心, AMI新刊核心, CSSCI CIF: 4.933 AIF: 2.017',
    comments: [],
    tags: ['文献'],
    documentTitle: 'The Quiet Case for Walkable Streets',
    citationKey: 'YuGuoMingJinLiPingSuFang2026Hallucination',
    colorIndex: 3,
    kind: 'literature',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
  },
  {
    id: 'mn-demo-009',
    title: '',
    excerpt:
      '会员体系承担着差异化服务的重要一环，近年来已渗透到各个行业和领域，被实践证明是在市场竞争环境下提高客户黏性和消费水平的有效手段。',
    comments: [],
    tags: ['摘录/背景'],
    page: 1,
    documentTitle: '基于广电融合业务的会员管理系统建设与应用',
    citationKey: 'qin2024membership',
    colorIndex: 2,
    kind: 'excerpt',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 11,
  },
]

/**
 * 宿主的显示预览。
 *
 * 有标题时预览等于标题，没有标题时预览取正文首段。
 */
function mockPreview(card: MnCard): string {
  const title = card.title.trim()
  if (title) return title
  return card.excerpt.replace(/\s+/g, ' ').trim().slice(0, 64)
}

const cards: MnCard[] = rawCards.map((card) => ({ ...card, preview: mockPreview(card) }))

/**
 * 库外材料。
 *
 * 这些卡片在 MarginNote 的资料库里，不在当前学习集里。
 * 段落没有命中学习集时，相关面板会到这里寻找可用材料。
 */
const libraryNotes: MnCard[] = [
  {
    id: 'mn-lib-001',
    title: '侧栏宽度可以拖动调整',
    excerpt: '拖动侧栏与正文之间的分隔线即可调整宽度，宽度会保存下来，下次打开面板沿用同一数值。',
    comments: [],
    tags: ['手册/界面'],
    page: 2,
    documentTitle: '写作台使用手册',
    colorIndex: 1,
    kind: 'excerpt',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 13,
  },
  {
    id: 'mn-lib-002',
    title: '专注模式只留正文区域',
    excerpt: '专注模式隐藏侧栏与顶栏，仅保留正文，按 Esc 退出后侧栏与顶栏恢复原状。',
    comments: [],
    tags: ['手册/界面'],
    page: 6,
    documentTitle: '写作台使用手册',
    colorIndex: 2,
    kind: 'excerpt',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
  },
  {
    id: 'mn-lib-003',
    title: '导出 Markdown 时保留引用编号',
    excerpt: '导出的 Markdown 正文里，引用以脚注形式出现，脚注定义集中在文末。',
    comments: [],
    tags: ['手册/导出'],
    page: 11,
    documentTitle: '写作台使用手册',
    colorIndex: 3,
    kind: 'excerpt',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
  },
  {
    id: 'mn-lib-004',
    title: '卡片引用支持批量刷新',
    excerpt: '标题栏的刷新按钮会重新读取全部卡片的摘录与批注，读取期间图标旋转。',
    comments: [],
    tags: ['手册/卡片'],
    page: 15,
    documentTitle: '写作台使用手册',
    colorIndex: 4,
    kind: 'excerpt',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 16,
  },
]

const allCards: MnCard[] = [...cards, ...libraryNotes]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const connection: MnConnection = { state: 'mock' }

export function createMockAdapter(): MnAdapter {
  return {
    kind: 'mock',
    async listCards(query?: string) {
      await wait(120)
      return filterCards(cards, query)
    },
    async getCards(ids: string[]) {
      await wait(80)
      const wanted = new Set(ids)
      return allCards.filter((card) => wanted.has(card.id))
    },
    async getSelectedCardIds() {
      return []
    },
    focusCard() {
      // 浏览器演示模式没有 MarginNote 可定位，保留为空实现。
    },
    async searchLibrary(query: string) {
      await wait(120)
      const needle = query.trim().toLowerCase()
      if (!needle) return { notes: [], documents: [], truncated: false }
      const notes = allCards
        .filter((card) => {
          const text = `${card.title} ${card.excerpt} ${card.tags.join(' ')}`.toLowerCase()
          return text.includes(needle)
        })
        .slice(0, 6)
        .map((card) => ({
          id: card.id,
          title: card.title,
          snippet: card.excerpt.slice(0, 80),
          topicId: 'mn-demo-topic',
          topicTitle: card.id.startsWith('mn-lib-') ? '写作台使用手册' : '演示学习集',
        }))
      return { notes, documents: [], truncated: false }
    },
    async locateDocument() {
      // 浏览器演示模式没有 MarginNote 可定位。
      return false
    },
    getConnection() {
      return connection
    },
    subscribeConnection() {
      return () => undefined
    },
    subscribeChange() {
      return () => undefined
    },
  }
}
