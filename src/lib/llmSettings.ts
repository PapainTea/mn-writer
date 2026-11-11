/**
 * 模型设置。
 *
 * 默认指向本机的 Ollama 服务，接口格式与 OpenAI 兼容。
 * 端点与模型名写入系统偏好，密钥只留在浏览器本地存储。
 */

import { readStoredValue, STORAGE_KEYS, writeStoredValue } from './storage'

export interface LlmSettings {
  /** 接口根地址，例如 `http://127.0.0.1:11434/v1`。 */
  endpoint: string
  /** 模型名。 */
  model: string
  /** 接口密钥，本机服务不需要。 */
  apiKey: string
}

export const DEFAULT_LLM_ENDPOINT = 'http://127.0.0.1:11434/v1'
export const DEFAULT_LLM_MODEL = 'qwen2.5:3b'

const API_KEY_STORAGE = 'mn-writer:llm-key:v1'

const listeners = new Set<() => void>()
let cache: LlmSettings | null = null

function readApiKey(): string {
  try {
    return window.localStorage.getItem(API_KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

function writeApiKey(value: string): void {
  try {
    if (value) window.localStorage.setItem(API_KEY_STORAGE, value)
    else window.localStorage.removeItem(API_KEY_STORAGE)
  } catch {
    // 浏览器存储不可用时密钥只留在内存里。
  }
}

export function getLlmSettings(): LlmSettings {
  if (cache) return cache
  const endpoint = readStoredValue(STORAGE_KEYS.llmEndpoint)
  const model = readStoredValue(STORAGE_KEYS.llmModel)
  cache = {
    endpoint: endpoint || DEFAULT_LLM_ENDPOINT,
    model: model || DEFAULT_LLM_MODEL,
    apiKey: readApiKey(),
  }
  return cache
}

export function saveLlmSettings(next: LlmSettings): void {
  cache = {
    endpoint: next.endpoint.trim() || DEFAULT_LLM_ENDPOINT,
    model: next.model.trim() || DEFAULT_LLM_MODEL,
    apiKey: next.apiKey.trim(),
  }
  writeStoredValue(STORAGE_KEYS.llmEndpoint, cache.endpoint)
  writeStoredValue(STORAGE_KEYS.llmModel, cache.model)
  writeApiKey(cache.apiKey)
  for (const listener of listeners) listener()
}

export function subscribeLlmSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
