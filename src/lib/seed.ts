import type { JSONContent } from '@tiptap/core'
import type { WriterDocument } from '../types'
import { sectionExtras } from './seedExtras'
import { demoSections, sectionNodes } from './seedSections'

/** 内置演示文稿的版本号，模板文案调整后递增，用于替换用户本机上的旧版本。 */
export const SEED_VERSION = 12

const demoContent: JSONContent = {
  type: 'doc',
  content: [
    ...demoSections.flatMap((section) => [
      ...sectionNodes(section),
      ...(sectionExtras[section.heading] ?? []),
    ]),
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
