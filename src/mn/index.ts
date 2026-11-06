import type { MnAdapter } from '../types'
import { createBridgeAdapter } from './bridge'
import { createMockAdapter } from './mock'

let adapter: MnAdapter | null = null

export function getAdapter(): MnAdapter {
  if (!adapter) {
    adapter = typeof window !== 'undefined' && window.mn ? createBridgeAdapter() : createMockAdapter()
  }
  return adapter
}
