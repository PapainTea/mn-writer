/**
 * 主题与顶栏配色。
 *
 * 主题跟随系统时，页面底色随系统外观变化。
 */

import { useEffect, useState } from 'react'
import { loadTheme, persistTheme, type ThemeMode } from '../lib/storage'

export function useWriterTheme(): [ThemeMode, (mode: ThemeMode) => void] {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme())

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.dataset.theme = theme
    persistTheme(theme)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyThemeColor = () => {
      const effective = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', effective === 'dark' ? '#121311' : '#f4f1ea')
    }
    applyThemeColor()
    if (theme !== 'system') return
    media.addEventListener('change', applyThemeColor)
    return () => media.removeEventListener('change', applyThemeColor)
  }, [theme])

  return [theme, setTheme]
}
