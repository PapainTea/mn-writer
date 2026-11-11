/**
 * 模型接口。
 *
 * 接口格式与 OpenAI 的 chat completions 兼容，
 * 本机的 Ollama 与多数自建服务都能直接使用。
 */

import { getLlmSettings } from '../lib/llmSettings'

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmRequest {
  messages: LlmMessage[]
  temperature?: number
  signal?: AbortSignal
}

export class LlmError extends Error {
  readonly hint: string

  constructor(message: string, hint: string) {
    super(message)
    this.name = 'LlmError'
    this.hint = hint
  }
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string }
}

const REQUEST_TIMEOUT = 90_000

function endpointUrl(base: string, path: string): string {
  const trimmed = base.trim().replace(/\/+$/, '')
  return trimmed + path
}

/**
 * 向模型发送一次对话请求。
 *
 * 失败时抛出带有排查提示的错误，由界面层展示。
 */
export async function chat(request: LlmRequest): Promise<string> {
  const settings = getLlmSettings()
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  const onAbort = () => controller.abort()
  request.signal?.addEventListener('abort', onAbort)
  try {
    const response = await fetch(endpointUrl(settings.endpoint, '/chat/completions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: settings.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.3,
        stream: false,
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new LlmError(
        `模型服务返回 ${response.status}`,
        detail.slice(0, 160) || '检查端点地址与模型名是否正确。',
      )
    }
    const payload = (await response.json()) as ChatCompletionResponse
    if (payload.error?.message) {
      throw new LlmError('模型服务出错', payload.error.message.slice(0, 160))
    }
    const content = payload.choices?.[0]?.message?.content
    if (!content || !content.trim()) {
      throw new LlmError('模型没有返回内容', '换用能力更强的模型后重试。')
    }
    return content.trim()
  } catch (error) {
    if (error instanceof LlmError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LlmError('请求超时', '本机模型首次加载较慢，稍后再试一次。')
    }
    throw new LlmError('无法连接模型服务', '确认服务已启动，端点地址与端口一致。')
  } finally {
    window.clearTimeout(timer)
    request.signal?.removeEventListener('abort', onAbort)
  }
}

/** 读取模型列表，用于设置界面确认服务可用。 */
export async function listModels(): Promise<string[]> {
  const settings = getLlmSettings()
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(endpointUrl(settings.endpoint, '/models'), {
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(String(response.status))
    const payload = (await response.json()) as { data?: { id?: string }[] }
    return (payload.data ?? [])
      .map((item) => item.id ?? '')
      .filter((id) => Boolean(id))
  } finally {
    window.clearTimeout(timer)
  }
}
