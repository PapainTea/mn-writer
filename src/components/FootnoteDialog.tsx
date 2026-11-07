import { Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  closeFootnoteEditor,
  getFootnoteEditor,
  subscribeFootnoteEditor,
} from '../editor/footnoteEditor'

/**
 * 脚注编辑浮层。
 *
 * 浮层固定在面板底部，正文行高不随编辑状态变化，
 * 浮动工具条也不会遮挡输入区域。
 */
export function FootnoteDialog() {
  const request = useSyncExternalStore(
    subscribeFootnoteEditor,
    getFootnoteEditor,
    getFootnoteEditor,
  )
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!request) return
    // 每次打开浮层都载入当前脚注正文，并聚焦输入框。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(request.content)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [request])

  if (!request) return null

  const save = () => {
    request.apply(value.trim())
    closeFootnoteEditor()
  }

  return (
    <div className="footnote-overlay" onPointerDown={save}>
      <div
        className="footnote-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`编辑脚注 ${request.number}`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="footnote-sheet-head">
          <span className="footnote-sheet-title">脚注 {request.number}</span>
          <button type="button" className="mn-icon-button" onClick={save} title="保存并关闭">
            <X size={17} />
          </button>
        </header>

        <textarea
          ref={inputRef}
          className="footnote-sheet-input"
          value={value}
          placeholder="填写脚注内容"
          aria-label="脚注内容"
          rows={4}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              save()
              return
            }
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              save()
            }
          }}
        />

        <footer className="footnote-sheet-foot">
          <button
            type="button"
            className="footnote-action is-danger"
            onClick={() => {
              request.remove()
              closeFootnoteEditor()
            }}
          >
            <Trash2 size={14} strokeWidth={1.8} />
            删除脚注
          </button>
          <span className="footnote-hint">Esc 保存并关闭</span>
          <button type="button" className="footnote-action is-primary" onClick={save}>
            保存
          </button>
        </footer>
      </div>
    </div>
  )
}
