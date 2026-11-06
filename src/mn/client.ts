interface BridgeErrorPayload {
  code: string
  message: string
  retryable?: boolean
}

interface BridgeResponse {
  error?: BridgeErrorPayload
}

export interface BridgeRoute {
  method: string
  path: string
}

export interface Capabilities {
  bridgeApiVersion?: string
  routes?: BridgeRoute[]
  noteMetadata?: { maxNoteIds?: number }
}

const REQUEST_TIMEOUT = 15_000
const CAPABILITIES_TTL = 60_000

let capabilityCache: { value: Capabilities; readAt: number } | null = null

export class BridgeUnavailableError extends Error {
  constructor() {
    super('当前页面没有 MarginNote 桥接')
    this.name = 'BridgeUnavailableError'
  }
}

export class BridgeCallError extends Error {
  readonly code: string

  constructor(error: BridgeErrorPayload) {
    super(error.message || error.code)
    this.name = 'BridgeCallError'
    this.code = error.code
  }
}

function withTimeout<T>(task: Promise<T>, path: string, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`读取 ${path} 超时`)), timeout)
    task.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export async function callBridge<T>(
  path: string,
  options?: { method?: 'GET' | 'POST'; body?: unknown },
  timeout = REQUEST_TIMEOUT,
): Promise<T> {
  const bridge = typeof window === 'undefined' ? undefined : window.mn
  if (!bridge || typeof bridge.api !== 'function') throw new BridgeUnavailableError()
  const result = await withTimeout(
    bridge.api<T & BridgeResponse>(path, options as RequestInit | undefined),
    path,
    timeout,
  )
  if (result && typeof result === 'object' && 'error' in result && result.error) {
    throw new BridgeCallError(result.error)
  }
  return result
}

export async function readCapabilities(): Promise<Capabilities> {
  if (capabilityCache && Date.now() - capabilityCache.readAt < CAPABILITIES_TTL) {
    return capabilityCache.value
  }
  try {
    const value = await callBridge<Capabilities>('/capabilities')
    capabilityCache = { value, readAt: Date.now() }
    return value
  } catch {
    return {}
  }
}

function normalizeRoute(path: string): string {
  return path.replace(/\{[^}]+\}/g, '{id}')
}

export function supportsRoute(capabilities: Capabilities, method: string, path: string): boolean {
  if (!capabilities.routes?.length) return true
  const target = normalizeRoute(path)
  return capabilities.routes.some(
    (route) => route.method.toUpperCase() === method && normalizeRoute(route.path) === target,
  )
}
