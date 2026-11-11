/**
 * 模型设置弹层。
 *
 * 默认连接本机的模型服务，
 * 也可以改写端点与模型名接入自建服务。
 */

import { Check, Plug, X } from 'lucide-react'
import { useState } from 'react'
import {
  DEFAULT_LLM_ENDPOINT,
  DEFAULT_LLM_MODEL,
  getLlmSettings,
  saveLlmSettings,
  type LlmSettings,
} from '../lib/llmSettings'
import { listModels } from '../mn/llm'

interface ModelSettingsDialogProps {
  open: boolean
  onClose: () => void
  onToast: (message: string) => void
}

type ProbeState = 'idle' | 'testing' | 'ok' | 'failed'

export function ModelSettingsDialog({ open, onClose, onToast }: ModelSettingsDialogProps) {
  const current = getLlmSettings()
  const [endpoint, setEndpoint] = useState(current.endpoint || DEFAULT_LLM_ENDPOINT)
  const [model, setModel] = useState(current.model || DEFAULT_LLM_MODEL)
  const [apiKey, setApiKey] = useState(current.apiKey)
  const [probe, setProbe] = useState<ProbeState>('idle')
  const [models, setModels] = useState<string[]>([])

  if (!open) return null

  const save = (next: LlmSettings) => {
    saveLlmSettings(next)
    onToast('模型设置已保存')
    onClose()
  }

  const test = async () => {
    setProbe('testing')
    saveLlmSettings({ endpoint, model, apiKey })
    try {
      const list = await listModels()
      setModels(list)
      setProbe('ok')
    } catch {
      setProbe('failed')
    }
  }

  return (
    <div className="picker-overlay" onPointerDown={onClose}>
      <div
        className="model-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="模型设置"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="model-dialog-head">
          <span className="model-dialog-title">模型设置</span>
          <button type="button" className="mn-icon-button" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="model-dialog-body">
          <label className="model-field">
            <span className="model-field-label">接口地址</span>
            <input
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder={DEFAULT_LLM_ENDPOINT}
              spellCheck={false}
            />
            <span className="model-field-hint">接口格式与 OpenAI 兼容，本机服务填 127.0.0.1 的端口。</span>
          </label>

          <label className="model-field">
            <span className="model-field-label">模型名</span>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={DEFAULT_LLM_MODEL}
              spellCheck={false}
            />
            {models.length > 0 && (
              <span className="model-field-hint">服务可用，模型有：{models.join('、')}</span>
            )}
          </label>

          <label className="model-field">
            <span className="model-field-label">接口密钥</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="本机服务留空"
              spellCheck={false}
            />
            <span className="model-field-hint">密钥只保存在本机浏览器，不写入系统偏好。</span>
          </label>

          <div className="model-dialog-probe">
            <button type="button" className="mn-button" onClick={() => void test()} disabled={probe === 'testing'}>
              <Plug size={13} strokeWidth={1.8} />
              {probe === 'testing' ? '测试中' : '测试连接'}
            </button>
            {probe === 'ok' && (
              <span className="model-probe is-ok">
                <Check size={12} strokeWidth={2.4} /> 连接正常
              </span>
            )}
            {probe === 'failed' && <span className="model-probe is-failed">无法连接，请检查地址与端口</span>}
          </div>
        </div>

        <div className="model-dialog-foot">
          <button type="button" className="mn-button" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="mn-button is-primary"
            onClick={() => save({ endpoint, model, apiKey })}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
