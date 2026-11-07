import { compareTextKey } from './htmlText'

const REF_PATTERN = /marginnote4app:\/\/markdownimg\/[a-z0-9.+-]+\/[^\s)"'<>]+/gi

/**
 * 把卡片正文里的图片地址换成已经取回的图片地址。
 *
 * 宿主用 `marginnote4app://markdownimg/...` 记录图片，页面读不到这个协议，
 * 只能换成取回的地址。取不到时清空地址，图片位置留空。
 */
export function rewriteMediaRefs(html: string, hashUrls: Map<string, string>): string {
  return String(html ?? '').replace(REF_PATTERN, (match) => {
    const hash = match.slice(match.lastIndexOf('/') + 1)
    if (!hash) return ''
    return hashUrls.get(hash) ?? ''
  })
}

/**
 * 去掉与标题重复的开头文字。
 *
 * 卡片的标题常常直接取自正文第一行，卡片块已经用标题展示过这段文字，
 * 正文里再出现一次就是重复。图片不参与比较，含图片的节点会继续向下查找。
 */
export function pruneDuplicateText(html: string, text: string): string {
  const target = compareTextKey(text)
  if (!target || typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html')

  const visit = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      const hasImage = Boolean(child.querySelector('img'))
      if (!hasImage && compareTextKey(child.textContent ?? '') === target) {
        child.remove()
        continue
      }
      if (hasImage) visit(child)
    }
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === 3 && compareTextKey(node.textContent ?? '') === target) node.remove()
    }
  }

  visit(doc.body)
  return doc.body.innerHTML
}
