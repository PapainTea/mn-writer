const TOAST_EVENT = 'mn-writer:toast'

export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }))
}

export function subscribeToast(next: (message: string) => void): () => void {
  const handler = (event: Event) => {
    const message = (event as CustomEvent<string>).detail
    if (typeof message === 'string') next(message)
  }
  window.addEventListener(TOAST_EVENT, handler)
  return () => window.removeEventListener(TOAST_EVENT, handler)
}
