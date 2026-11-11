/**
 * 滚动渐变。
 *
 * 可以继续滚动的方向上出现渐变，提示该方向还有内容。
 */

export interface ScrollFadeState {
  /** 上方还有内容。 */
  top: boolean
  /** 下方还有内容。 */
  bottom: boolean
}

/** 判断滚动容器的渐变状态。 */
export function scrollFadeState(scroller: HTMLElement): ScrollFadeState {
  const max = scroller.scrollHeight - scroller.clientHeight
  const scrollable = max > 1
  return {
    top: scrollable && scroller.scrollTop > 1,
    bottom: scrollable && scroller.scrollTop < max - 1,
  }
}
