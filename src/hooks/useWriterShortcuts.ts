/**
 * 写作台快捷键。
 *
 * macOS 使用 ⌘，Windows 使用 Ctrl。
 */

import { useEffect } from 'react'

interface WriterShortcutsOptions {
  pickerOpen: boolean
  focusMode: boolean
  onOpenPicker: () => void
  onToggleFocus: () => void
  onSave: () => void
}

export function useWriterShortcuts({
  pickerOpen,
  focusMode,
  onOpenPicker,
  onToggleFocus,
  onSave,
}: WriterShortcutsOptions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey
      if (modifier && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpenPicker()
        return
      }
      if (modifier && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        onSave()
        return
      }
      if (modifier && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        onToggleFocus()
        return
      }
      if (event.key === 'Escape' && !pickerOpen && focusMode) onToggleFocus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusMode, onOpenPicker, onSave, onToggleFocus, pickerOpen])
}
