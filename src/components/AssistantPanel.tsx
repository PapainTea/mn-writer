/**
 * 段落助手面板。
 *
 * 面板把当前选区、可用依据与模型输出放在一起，
 * 作者在采纳之前始终能看到建议依据了哪些卡片，
 * 也能逐条核对建议里的依据编号。
 */

import { ArrowDownToLine, Check, Copy, RefreshCw, Settings2, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import {
  ASSISTANT_TASKS,
  buildAssistantMessages,
  cleanAssistantOutput,
  type AssistantAction,
  type AssistantEvidence,
} from '../lib/assistant'
import { resolveAssistantMarks, splitAssistantResult } from '../lib/assistantMarks'
import { copyPlainText } from '../lib/clipboard'
import { cardSummary } from '../lib/cardSummary'
import { pickEvidenceHits } from '../lib/evidencePick'
import { glossaryLabel, type GlossaryTerm } from '../lib/glossary'
import { getLlmSettings } from '../lib/llmSettings'
import type { RelevanceHit } from '../lib/relevance'
import { chat, LlmError } from '../mn/llm'
import type { MnCard } from '../types'
import { AssistantEvidenceList, type AssistantEvidenceItem } from './AssistantEvidenceList'

export interface AssistRange {
  from: number
  to: number
  text: string
  /** 选区所在段落与上一段，给模型交代写作语境。 */
  heading?: string
  previous?: string
}

interface AssistantPanelProps {
  range: AssistRange | null
  editor: Editor | null
  hits: RelevanceHit[]
  /** 当前文稿标题。 */
  documentTitle: string
  glossary: GlossaryTerm[]
  onClose: () => void
  onOpenSettings: () => void
  onToast: (message: string) => void
  onFocusCard: (card: MnCard) => void
}

type Status = 'idle' | 'running' | 'done' | 'error'

const MAX_EVIDENCE = 4

export function AssistantPanel({
  range,
  editor,
  hits,
  documentTitle,
  glossary,
  onClose,
  onOpenSettings,
  onToast,
  onFocusCard,
}: AssistantPanelProps) {
  const [action, setAction] = useState<AssistantAction>('polish')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState('')
  const [error, setError] = useState<{ message: string; hint: string } | null>(null)
  /** 建议正文里当前指向的依据编号。 */
  const [activeEvidence, setActiveEvidence] = useState<number | null>(null)
  const settings = getLlmSettings()
  const evidenceRef = useRef<HTMLElement | null>(null)

  const numbered = useMemo<AssistantEvidenceItem[]>(() => {
    return pickEvidenceHits(hits)
      .slice(0, MAX_EVIDENCE)
      .map((hit, index) => {
        const summary = cardSummary(hit.card)
        return {
          number: index + 1,
          title: summary.identifier,
          source: summary.source,
          excerpt: hit.passage || summary.body,
          terms: hit.terms,
          card: hit.card,
          via: hit.via,
        }
      })
  }, [hits])

  const evidence = useMemo<AssistantEvidence[]>(() => {
    return numbered.map((item) => ({
      title: item.title,
      source: item.source,
      via: item.via,
      excerpt: item.excerpt,
      citationKey: item.card.citationKey,
      page: item.card.page,
    }))
  }, [numbered])

  const terms = useMemo(() => glossary.map((item) => item.term), [glossary])

  const segments = useMemo(() => splitAssistantResult(result), [result])

  /** 采纳建议时，依据标记转成正文引用。 */
  const adopted = useMemo(
    () => resolveAssistantMarks(result, evidence),
    [evidence, result],
  )

  useEffect(() => {
    if (activeEvidence === null) return
    const target = evidenceRef.current?.querySelector(
      '[data-number="' + activeEvidence + '"]',
    )
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeEvidence])

  if (!range) return null

  const run = async () => {
    if (!range) return
    setStatus('running')
    setError(null)
    try {
      const messages = buildAssistantMessages(action, range.text, evidence, {
        title: documentTitle,
        heading: range.heading,
        previous: range.previous,
        glossary: terms,
      })
      const output = await chat({ messages })
      setResult(cleanAssistantOutput(output))
      setStatus('done')
    } catch (caught) {
      if (caught instanceof LlmError) {
        setError({ message: caught.message, hint: caught.hint })
      } else {
        setError({ message: '生成失败', hint: '稍后再试一次。' })
      }
      setStatus('error')
    }
  }

  /** 建议按行拆成段落，每一行是一个段落。 */
  const adoptedParagraphs = () =>
    adopted
      .split(/\n+/)
      .filter((line) => line.trim().length > 0)
      .map((line) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: line }],
      }))

  const replaceSelection = () => {
    if (!editor || !adopted) return
    editor
      .chain()
      .focus()
      .deleteRange({ from: range.from, to: range.to })
      .insertContentAt(range.from, adoptedParagraphs())
      .run()
    onToast('已替换选中的文字')
    onClose()
  }

  const insertAfter = () => {
    if (!editor || !adopted) return
    const paragraph = editor.state.doc.nodeAt(range.from)
    if (!paragraph) {
      onToast('插入失败，请重试')
      return
    }
    const position = range.from + paragraph.nodeSize
    editor.chain().focus().insertContentAt(position, adoptedParagraphs()).run()
    onToast('已插入到段落之后')
    onClose()
  }

  const copyResult = async () => {
    const ok = await copyPlainText(adopted)
    onToast(ok ? '建议已复制' : '复制失败，请检查剪贴板权限')
  }

  return (
    <section className="assistant-panel" aria-label="段落助手">
      <header className="assistant-head">
        <span className="assistant-marker">
          <Sparkles size={14} strokeWidth={1.8} />
        </span>
        <span className="assistant-title">段落助手</span>
        <span className="assistant-model">{settings.model}</span>
        <button type="button" className="mn-icon-button" onClick={onOpenSettings} title="模型设置">
          <Settings2 size={15} strokeWidth={1.8} />
        </button>
        <button type="button" className="mn-icon-button" onClick={onClose} title="关闭">
          <X size={16} strokeWidth={1.8} />
        </button>
      </header>

      <div className="assistant-body">
        <div className="assistant-column assistant-column-context">
          <div className="assistant-context">
            <span className="assistant-context-label">选区</span>
            <p className="assistant-context-text">{range.text}</p>
          </div>
          <div className="assistant-context assistant-context-evidence">
            <span className="assistant-context-label">依据</span>
            <span className="assistant-evidence-holder" ref={evidenceRef}>
              <AssistantEvidenceList
                items={numbered}
                active={activeEvidence}
                onActive={setActiveEvidence}
                onFocus={onFocusCard}
              />
            </span>
          </div>
          {terms.length > 0 && (
            <div className="assistant-context">
              <span className="assistant-context-label">文稿术语</span>
              <p className="assistant-context-text">{glossaryLabel(glossary)}</p>
            </div>
          )}
        </div>

        <div className="assistant-column assistant-column-main">
          <div className="assistant-actions">
            {ASSISTANT_TASKS.map((task) => (
              <button
                type="button"
                key={task.action}
                className={action === task.action ? 'is-active' : ''}
                onClick={() => setAction(task.action)}
                title={task.description}
              >
                {task.label}
              </button>
            ))}
            <button
              type="button"
              className="assistant-run"
              onClick={() => void run()}
              disabled={status === 'running'}
            >
              {status === 'running' ? (
                <RefreshCw size={13} strokeWidth={2} className="is-spinning" />
              ) : (
                <Sparkles size={13} strokeWidth={2} />
              )}
              {status === 'running' ? '生成中' : '生成建议'}
            </button>
          </div>

          {status === 'error' && error && (
            <p className="assistant-error">
              <span className="assistant-error-message">{error.message}</span>
              <span className="assistant-error-hint">{error.hint}</span>
            </p>
          )}

          {status === 'done' && (
            <div className="assistant-result">
              <p className="assistant-result-text">
                {segments.map((segment, index) =>
                  segment.kind === 'text' ? (
                    <span key={index}>{segment.text}</span>
                  ) : (
                    <button
                      type="button"
                      key={index}
                      className={
                        'assistant-mark' + (activeEvidence === segment.number ? ' is-active' : '')
                      }
                      onClick={() =>
                        setActiveEvidence(
                          activeEvidence === segment.number ? null : segment.number,
                        )
                      }
                      title={'依据 ' + segment.number}
                      aria-label={'查看依据 ' + segment.number}
                      aria-pressed={activeEvidence === segment.number}
                    >
                      {segment.number}
                    </button>
                  ),
                )}
              </p>
              <div className="assistant-result-actions">
                <button type="button" className="mn-button" onClick={() => void copyResult()}>
                  <Copy size={13} strokeWidth={1.8} /> 复制
                </button>
                <button type="button" className="mn-button" onClick={insertAfter}>
                  <ArrowDownToLine size={13} strokeWidth={1.8} /> 插入到后面
                </button>
                <button type="button" className="mn-button is-primary" onClick={replaceSelection}>
                  <Check size={13} strokeWidth={2} /> 替换选区
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
