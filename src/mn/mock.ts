import type { MnAdapter, MnCard, MnConnection } from '../types'
import { filterCards } from '../lib/cardSearch'

const cards: MnCard[] = [
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
]

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
      return cards.filter((card) => wanted.has(card.id))
    },
    async getSelectedCardId() {
      return null
    },
    focusCard() {
      // 浏览器演示模式没有 MarginNote 可定位，保留为空实现。
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
