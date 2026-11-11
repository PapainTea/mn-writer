/**
 * 斜杠命令菜单。
 *
 * 菜单限制最大高度，内容超出时在菜单内部滚动。
 * 可以继续滚动的方向显示渐变，提示还有内容。
 */

import type { Editor, Range } from '@tiptap/core'
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from '@tiptap/suggestion'
import { scrollFadeState } from '../lib/scrollFade'

export interface SlashItem {
  title: string
  hint: string
  keywords: string
  run: (context: { editor: Editor; range: Range }) => void
}

export function createMenu() {
  let element: HTMLDivElement | null = null
  let scroller: HTMLDivElement | null = null
  let rows: HTMLButtonElement[] = []
  let observer: ResizeObserver | null = null
  let unmount: (() => void) | null = null
  let items: SlashItem[] = []
  let selected = 0
  let command: ((item: SlashItem) => void) | null = null

  /** 更新上下边缘的渐变提示。 */
  const syncFade = () => {
    if (!element || !scroller) return
    const state = scrollFadeState(scroller)
    element.classList.toggle('is-scrollable-top', state.top)
    element.classList.toggle('is-scrollable-bottom', state.bottom)
  }

  /** 选中项滚动到视野，只滚动菜单内部。 */
  const revealSelected = () => {
    const row = rows[selected]
    if (!scroller || !row) return
    const rowRect = row.getBoundingClientRect()
    const boxRect = scroller.getBoundingClientRect()
    if (rowRect.top < boxRect.top) {
      scroller.scrollTop -= boxRect.top - rowRect.top
    } else if (rowRect.bottom > boxRect.bottom) {
      scroller.scrollTop += rowRect.bottom - boxRect.bottom
    }
  }

  const syncSelected = () => {
    rows.forEach((row, index) => {
      const active = index === selected
      row.classList.toggle('is-active', active)
      row.setAttribute('aria-selected', String(active))
    })
    revealSelected()
    syncFade()
  }

  const buildRows = () => {
    if (!scroller) return
    scroller.replaceChildren()
    rows = []
    items.forEach((item, index) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.className = `slash-item${index === selected ? ' is-active' : ''}`
      row.setAttribute('role', 'option')
      row.setAttribute('aria-selected', String(index === selected))

      const title = document.createElement('span')
      title.className = 'slash-item-title'
      title.textContent = item.title

      const hint = document.createElement('span')
      hint.className = 'slash-item-hint'
      hint.textContent = item.hint

      row.append(title, hint)
      row.addEventListener('mousedown', (event) => {
        event.preventDefault()
        command?.(item)
      })
      scroller?.appendChild(row)
      rows.push(row)
    })
    if (items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'slash-empty'
      empty.textContent = '没有匹配的命令'
      scroller.appendChild(empty)
    }
    revealSelected()
    // 先按当前布局同步一次，再等高度限制生效后复核，避免首帧缺少渐变。
    syncFade()
    requestAnimationFrame(syncFade)
  }

  return {
    onStart(props: SuggestionProps<SlashItem>) {
      element = document.createElement('div')
      element.className = 'slash-menu'
      element.setAttribute('role', 'listbox')
      scroller = document.createElement('div')
      scroller.className = 'slash-scroll'
      scroller.setAttribute('role', 'presentation')
      scroller.addEventListener('scroll', syncFade, { passive: true })
      const fadeTop = document.createElement('span')
      fadeTop.className = 'slash-fade is-top'
      const fadeBottom = document.createElement('span')
      fadeBottom.className = 'slash-fade is-bottom'
      element.append(scroller, fadeTop, fadeBottom)
      unmount = props.mount(element)
      items = props.items
      selected = 0
      command = props.command
      buildRows()
      // 菜单高度会被可用空间限制，尺寸变化以后重新计算渐变。
      observer = new ResizeObserver(syncFade)
      observer.observe(scroller)
    },
    onUpdate(props: SuggestionProps<SlashItem>) {
      items = props.items
      selected = 0
      command = props.command
      // 检索词变化以后回到顶部，选中项从头开始。
      if (scroller) scroller.scrollTop = 0
      buildRows()
    },
    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === 'ArrowDown') {
        selected = Math.min(selected + 1, Math.max(items.length - 1, 0))
        syncSelected()
        return true
      }
      if (props.event.key === 'ArrowUp') {
        selected = Math.max(selected - 1, 0)
        syncSelected()
        return true
      }
      if (props.event.key === 'Enter' || props.event.key === 'Tab') {
        const item = items[selected]
        if (item) {
          command?.(item)
          return true
        }
        return false
      }
      return false
    },
    onExit() {
      observer?.disconnect()
      observer = null
      unmount?.()
      unmount = null
      element = null
      scroller = null
      rows = []
      items = []
    },
  }
}

