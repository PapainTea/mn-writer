/** 复制纯文本。 */
export async function copyPlainText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * 复制富文本，同时写入纯文本。
 *
 * 目标程序只认纯文本时，剪贴板里的纯文本仍然可用。
 */
export async function copyRichContent(text: string, html: string): Promise<boolean> {
  if (typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ])
      return true
    } catch {
      // 富文本写入失败时回落到纯文本。
    }
  }
  return copyPlainText(text)
}
