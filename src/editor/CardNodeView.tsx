import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  Quote,
  RefreshCw,
  Trash2,
  Type,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react'
import { replaceCardWithCitation, replaceCardWithText } from './cardToText'
import { getCardViewMode, subscribeCardView } from '../lib/cardView'
import { CARD_KIND_LABEL, cardSummary } from '../lib/cardSummary'
import {
  blockPlainText,
  cardContentBlocks,
  cardPlainText,
  cardRichHtml,
  isTextBlock,
  type CardContentBlock,
} from '../lib/cardContent'
import { CommentBody, renderCommentHtml } from '../lib/commentRender'
import { RichContent } from '../lib/RichContent'
import { CardMedia } from '../components/CardMedia'
import { copyPlainText, copyRichContent } from '../lib/clipboard'
import { pruneDuplicateText, rewriteMediaRefs } from '../lib/mediaHtml'
import { compareTextKey, readMediaRefs } from '../lib/htmlText'
import { showToast } from '../lib/toast'
import { useCardMedia } from '../hooks/useCardMedia'
import { getAdapter } from '../mn'
import type { MnCard, MnMedia } from '../types'
import { cardColorIndex } from './cardColors'

const LONG_EXCERPT_LENGTH = 150

function citationOf(card: MnCard): string {
  if (card.citationKey) {
    return `[@${card.citationKey}${card.page ? `, p.${card.page}` : ''}]`
  }
  return `[mn:${card.id}]`
}

function mediaOf(block: CardContentBlock): MnMedia | null {
  return block.kind === 'media' ? block.media : null
}

export function CardNodeView({
  node,
  selected,
  deleteNode,
  updateAttributes,
  getPos,
  editor,
}: NodeViewProps) {
  const card = node.attrs.snapshot as MnCard | null
  const viewMode = useSyncExternalStore(subscribeCardView, getCardViewMode, getCardViewMode)
  const [menuOpen, setMenuOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [excerptExpanded, setExcerptExpanded] = useState(false)
  const [seenMode, setSeenMode] = useState(viewMode)
  const rootRef = useRef<HTMLDivElement>(null)

  const blocks = useMemo(() => (card ? cardContentBlocks(card) : []), [card])
  const media = useMemo(
    () =>
      blocks
        .map(mediaOf)
        .filter((item): item is MnMedia => item !== null),
    [blocks],
  )
  const mediaState = useCardMedia(card?.id ?? '', media)

  if (seenMode !== viewMode) {
    setSeenMode(viewMode)
    setExpanded(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuOpen])

  if (!card) {
    return (
      <NodeViewWrapper className="mn-card-block is-missing">
        <div className="mn-card-missing">卡片数据缺失，请重新插入。</div>
      </NodeViewWrapper>
    )
  }

  const compact = viewMode === 'compact' && !expanded
  const summary = cardSummary(card)
  const titleKey = compareTextKey(summary.title)
  const tags = card.tags.slice(0, 4)
  const extraTags = card.tags.length - tags.length
  const excerptBlock = blocks.find(
    (block): block is CardContentBlock & { source: 'excerpt' } =>
      isTextBlock(block) && block.source === 'excerpt',
  )
  const commentBlocks = blocks.filter(
    (block): block is CardContentBlock & { source: 'comment' } =>
      isTextBlock(block) &&
      block.source === 'comment' &&
      compareTextKey(blockPlainText(block)) !== titleKey,
  )
  const excerptText = excerptBlock ? blockPlainText(excerptBlock) : ''
  // 正文里已经画出的图片不再重复排列一遍。
  const inlineHashes = new Set<string>()
  const renderedBlocks: CardContentBlock[] = [
    ...(excerptBlock ? [excerptBlock] : []),
    ...commentBlocks,
  ]
  for (const block of renderedBlocks) {
    if (block.kind !== 'html') continue
    for (const ref of readMediaRefs(block.html)) inlineHashes.add(ref.hash)
  }
  const gridMedia = media.filter((item) => !item.hash || !inlineHashes.has(item.hash))
  const longExcerpt =
    excerptText.length > LONG_EXCERPT_LENGTH ||
    (excerptText.match(/\n/g)?.length ?? 0) >= 2

  /** 复制卡片的正文，优先写入富文本。 */
  const copyContent = async () => {
    const plain = cardPlainText(card)
    if (!plain.trim()) {
      showToast('卡片没有可复制的文字')
      return
    }
    const rich = rewriteMediaRefs(cardRichHtml(card), mediaState.hashUrls)
    const ok = await copyRichContent(plain, rich)
    showToast(ok ? '卡片内容已复制' : '复制失败，请检查剪贴板权限')
  }

  const copyCitation = async () => {
    const ok = await copyPlainText(citationOf(card))
    showToast(ok ? '引用已复制' : '复制失败，请检查剪贴板权限')
    setMenuOpen(false)
  }

  const focusCard = () => {
    if (getAdapter().kind === 'mock') {
      showToast('演示数据无法定位')
      setMenuOpen(false)
      return
    }
    getAdapter().focusCard(card.id)
    setMenuOpen(false)
  }

  /** 双击卡片定位到 MarginNote。按钮与菜单区域不触发定位。 */
  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button') || target.closest('.mn-card-menu')) return
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed && selection.toString().trim()) return
    event.preventDefault()
    focusCard()
  }

  const refreshCard = async () => {
    const [next] = await getAdapter().getCards([card.id])
    if (!next) {
      showToast('刷新失败，请稍后重试')
      setMenuOpen(false)
      return
    }
    updateAttributes({ snapshot: next, cardId: next.id })
    showToast('卡片内容已更新')
    setMenuOpen(false)
  }

  /** 把卡片替换为正文段落，来源信息与引用关系一并移除。 */
  const convertToText = () => {
    setMenuOpen(false)
    if (!cardPlainText(card).trim() && media.length > 0) {
      showToast('卡片内容只有图片，无法转为文本')
      return
    }
    const pos = getPos()
    if (typeof pos !== 'number' || pos < 0) {
      showToast('转换失败，请稍后重试')
      return
    }
    const current = editor.state.doc.nodeAt(pos)
    if (!current || current.type.name !== 'cardBlock') {
      showToast('转换失败，请稍后重试')
      return
    }
    if (!replaceCardWithText(editor, pos, current, card)) {
      showToast('转换失败，请稍后重试')
      return
    }
    showToast('卡片已转为文本')
  }

  /** 把卡片替换为正文段落，并在末尾留下 Pandoc 引用。 */
  const convertToCitation = () => {
    setMenuOpen(false)
    if (!card.citationKey) {
      showToast('该卡片没有引用键，无法转为引用')
      return
    }
    const pos = getPos()
    if (typeof pos !== 'number' || pos < 0) {
      showToast('转换失败，请稍后重试')
      return
    }
    const current = editor.state.doc.nodeAt(pos)
    if (!current || current.type.name !== 'cardBlock') {
      showToast('转换失败，请稍后重试')
      return
    }
    if (!replaceCardWithCitation(editor, pos, current, card)) {
      showToast('转换失败，请稍后重试')
      return
    }
    showToast('卡片已转为引用')
  }

  const tools = (
    <div className="mn-card-tools">
      {viewMode === 'compact' && expanded && (
        <button
          type="button"
          className="mn-icon-button"
          onClick={() => setExpanded(false)}
          title="收起为简洁视图"
          aria-label="收起为简洁视图"
        >
          <ChevronUp size={15} strokeWidth={1.8} />
        </button>
      )}
      <button
        type="button"
        className="mn-icon-button"
        onClick={copyContent}
        title="复制卡片内容"
        aria-label="复制卡片内容"
      >
        <Copy size={15} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        className="mn-icon-button"
        onClick={() => setMenuOpen((value) => !value)}
        title="更多操作"
        aria-label="更多操作"
        aria-expanded={menuOpen}
      >
        <MoreHorizontal size={16} strokeWidth={1.8} />
      </button>
      {menuOpen && (
        <div className="mn-card-menu" role="menu">
          <button type="button" role="menuitem" onClick={focusCard}>
            <ExternalLink size={14} /> 在 MarginNote 中定位
          </button>
          <button type="button" role="menuitem" onClick={refreshCard}>
            <RefreshCw size={14} /> 刷新卡片内容
          </button>
          <button type="button" role="menuitem" onClick={convertToText}>
            <Type size={14} /> 转为文本
          </button>
          {card.citationKey && (
            <button type="button" role="menuitem" onClick={convertToCitation}>
              <Quote size={14} /> 转为引用
            </button>
          )}
          <button type="button" role="menuitem" onClick={copyCitation}>
            <Copy size={14} /> 复制引用
          </button>
          <div className="mn-card-menu-sep" />
          <button type="button" role="menuitem" className="is-danger" onClick={() => deleteNode()}>
            <Trash2 size={14} /> 从正文移除
          </button>
        </div>
      )}
    </div>
  )

  const renderExcerpt = () => {
    if (!excerptBlock) return null
    if (excerptBlock.kind === 'html') {
      const html = rewriteMediaRefs(
        pruneDuplicateText(excerptBlock.html, summary.title),
        mediaState.hashUrls,
      )
      const hasMedia = /<img\b/i.test(html)
      if (!hasMedia && !compareTextKey(html)) return null
      return (
        <div
          className={`mn-card-excerpt is-rich${hasMedia ? ' has-media' : ''}${
            excerptExpanded ? ' is-expanded' : ''
          }`}
        >
          <RichContent html={html} className="mn-card-rich" />
        </div>
      )
    }
    if (compareTextKey(excerptBlock.text) === titleKey) return null
    return (
      <p className={`mn-card-excerpt${excerptExpanded ? ' is-expanded' : ''}`}>
        {excerptBlock.text}
      </p>
    )
  }

  return (
    <NodeViewWrapper
      ref={rootRef}
      className={`mn-card-block${selected ? ' is-selected' : ''}${compact ? ' is-compact' : ''}`}
      data-tone={cardColorIndex(card.colorIndex)}
      onDoubleClick={handleDoubleClick}
    >
      {compact ? (
        <div className="mn-card-compact-row">
          <span className="mn-card-grip" data-drag-handle title="拖动卡片">
            <GripVertical size={15} strokeWidth={1.8} />
          </span>
          <button
            type="button"
            className="mn-card-compact-main"
            onClick={() => setExpanded(true)}
            title="展开卡片"
          >
            <span className="mn-card-compact-title">{summary.title}</span>
            {summary.excerpt && (
              <span className="mn-card-compact-excerpt">{summary.excerpt}</span>
            )}
          </button>
          <button
            type="button"
            className="mn-icon-button mn-card-expand"
            onClick={() => setExpanded(true)}
            title="展开卡片"
            aria-label="展开卡片"
          >
            <ChevronDown size={15} strokeWidth={1.8} />
          </button>
          {tools}
        </div>
      ) : (
        <>
          <div className="mn-card-head">
            <span className="mn-card-grip" data-drag-handle title="拖动卡片">
              <GripVertical size={15} strokeWidth={1.8} />
            </span>
            <span className="mn-card-kind">{CARD_KIND_LABEL[card.kind]}</span>
            {summary.source && <span className="mn-card-source">{summary.source}</span>}
            {tools}
          </div>

          <h3 className="mn-card-title">{summary.title}</h3>
          {renderExcerpt()}
          {longExcerpt && (
            <button
              type="button"
              className="mn-card-text-toggle"
              onClick={() => setExcerptExpanded((value) => !value)}
            >
              {excerptExpanded ? '收起' : '展开全文'}
            </button>
          )}
          {gridMedia.length > 0 && (
            <div className="mn-card-media-wrap">
              <CardMedia
                noteId={card.id}
                media={gridMedia}
                urls={mediaState.urls}
                pending={mediaState.pending}
              />
            </div>
          )}
          {commentBlocks.map((block, index) => (
            <div className="mn-card-comment" key={`comment-${index}`}>
              <span className="mn-card-comment-label">批注</span>
              {block.kind === 'html' ? (
                <CommentBody
                  comment={{ text: block.html, format: 'html' }}
                  html={renderCommentHtml({
                    text: rewriteMediaRefs(block.html, mediaState.hashUrls),
                    format: 'html',
                  })}
                />
              ) : (
                <CommentBody comment={{ text: block.text, format: block.format }} />
              )}
            </div>
          ))}

          <div className="mn-card-foot">
            <div className="mn-card-tags">
              {tags.map((tag) => (
                <span className="mn-tag" key={tag}>
                  {tag}
                </span>
              ))}
              {extraTags > 0 && <span className="mn-tag is-more">+{extraTags}</span>}
            </div>
            {card.citationKey && <span className="mn-card-cite">@{card.citationKey}</span>}
          </div>
        </>
      )}
    </NodeViewWrapper>
  )
}
