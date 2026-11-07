import type { Editor, JSONContent } from '@tiptap/core'
import { useCallback } from 'react'
import { documentTitleFromFile, parseDocumentFile } from '../lib/documentFile'
import { docToMarkdown } from '../lib/markdown'

/** 把内容写入文件并触发下载。 */
function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 把标题转成安全的文件名。 */
export function safeFilename(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '-').trim() || '未命名文稿'
}

interface ExportOptions {
  editor: Editor | null
  title: string
  onToast: (message: string) => void
  importDocument: (title: string, content: JSONContent) => { title: string }
}

/**
 * 文稿的导出与恢复。
 *
 * Markdown 用于继续排版，JSON 备份保留完整结构与卡片快照。
 */
export function useDocumentExport({
  editor,
  title,
  onToast,
  importDocument,
}: ExportOptions) {
  const copyMarkdown = useCallback(async () => {
    if (!editor) return
    const markdown = docToMarkdown(editor.getJSON())
    try {
      await navigator.clipboard.writeText(markdown)
      onToast('Markdown 已复制')
    } catch {
      onToast('复制失败，请检查剪贴板权限')
    }
  }, [editor, onToast])

  const downloadMarkdown = useCallback(() => {
    if (!editor) return
    downloadFile(`${safeFilename(title)}.md`, docToMarkdown(editor.getJSON()), 'text/markdown')
    onToast('Markdown 已下载')
  }, [editor, onToast, title])

  const downloadJson = useCallback(() => {
    if (!editor) return
    downloadFile(
      `${safeFilename(title)}.json`,
      JSON.stringify(editor.getJSON(), null, 2),
      'application/json',
    )
    onToast('JSON 备份已下载')
  }, [editor, onToast, title])

  const importJson = useCallback(
    async (file: File) => {
      if (!editor) return
      try {
        const content = parseDocumentFile(await file.text())
        editor.schema.nodeFromJSON(content)
        const imported = importDocument(documentTitleFromFile(file.name), content)
        onToast(`已恢复「${imported.title}」`)
      } catch (error) {
        onToast(error instanceof Error ? error.message : '导入失败，请检查文件内容')
      }
    },
    [editor, importDocument, onToast],
  )

  return { copyMarkdown, downloadMarkdown, downloadJson, importJson }
}
