import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** 应用内确认对话框。宿主网页视图不提供原生确认框，因此不能依赖 `window.confirm`。 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => cancelRef.current?.focus(), 30)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onCancel, open])

  if (!open) return null

  return (
    <div className="confirm-overlay" onPointerDown={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h2 className="confirm-title" id="confirm-dialog-title">
          {title}
        </h2>
        {description && <p className="confirm-text">{description}</p>}
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" ref={cancelRef} onClick={onCancel}>
            取消
          </button>
          <button type="button" className="confirm-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
