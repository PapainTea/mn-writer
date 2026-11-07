/**
 * 斜杠菜单的动作桥接。
 *
 * 扩展在创建时固定回调，主组件在挂载后登记实际实现，
 * 这样命令菜单不必随主组件重建，也不会在渲染期读取引用。
 */

export interface SlashActions {
  insertCard: () => void
  insertFootnote: () => void
  insertCrossRef: () => void
}

const actions: SlashActions = {
  insertCard: () => undefined,
  insertFootnote: () => undefined,
  insertCrossRef: () => undefined,
}

/** 登记斜杠菜单的实际动作。 */
export function registerSlashActions(next: Partial<SlashActions>): void {
  if (next.insertCard) actions.insertCard = next.insertCard
  if (next.insertFootnote) actions.insertFootnote = next.insertFootnote
  if (next.insertCrossRef) actions.insertCrossRef = next.insertCrossRef
}

/** 读取当前登记的动作。 */
export function slashActions(): SlashActions {
  return actions
}
