export interface NativeSelectionPayload {
  noteIds?: string[]
}

const NATIVE_TIMEOUT = 2_000

export function nativeBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.mn?.call === 'function'
}

export function callNative<T>(
  name: string,
  payload?: unknown,
  timeout = NATIVE_TIMEOUT,
): Promise<T> {
  if (!nativeBridgeAvailable()) return Promise.reject(new Error('原生桥不可用'))

  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`原生调用 ${name} 超时`)), timeout)
    window.mn
      .call<T>(name, payload)
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

export function onNativeSelection(listener: (noteIds: string[]) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<NativeSelectionPayload>).detail
    listener(Array.isArray(detail?.noteIds) ? detail.noteIds : [])
  }
  window.addEventListener('mn:selection', handler)
  return () => window.removeEventListener('mn:selection', handler)
}
