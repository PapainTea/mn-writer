/**
 * 引用卡片登记表。
 *
 * 插件在每次事务之后重新计算引用标记，
 * 卡片集合放在模块级登记表里，插件随时可以取到最新的一份。
 */

import type { MnCard } from '../types'

let cards: MnCard[] = []
let version = 0

/** 登记学习集里的卡片，版本号随之增加。 */
export function setCitationCards(next: MnCard[]): void {
  cards = next
  version += 1
}

/** 读取当前登记的卡片。 */
export function getCitationCards(): MnCard[] {
  return cards
}

/** 读取卡片集合的版本号，插件据此判断是否需要重新计算。 */
export function getCitationVersion(): number {
  return version
}
