import type { MnAdapter, MnCard, MnConnection } from '../types'
import { filterCards as filterCardsByQuery } from '../lib/cardSearch'
import { loadCards, loadStudySetCards } from './cards'
import { searchLibrary as searchLibraryInMn } from './library'
import { callNative, nativeBridgeAvailable } from './native'
import {
  BridgeCallError,
  BridgeUnavailableError,
  callBridge,
  readCapabilities,
  supportsRoute,
} from './client'

interface UiState {
  state?: {
    topicid?: string
    focusnoteid?: string
  }
}

interface ContextResponse {
  studySet?: {
    topicid?: string
    title?: string
  }
}

const LIVE_EVENTS = ['excerpt', 'comments', 'synced', 'undo', 'imported']

function describeError(error: unknown): string {
  if (error instanceof BridgeUnavailableError) return '当前页面没有 MarginNote 桥接'
  if (error instanceof BridgeCallError) return error.message
  if (error instanceof Error) return error.message
  return '无法读取 MarginNote 数据'
}

function filterCards(cards: MnCard[], query: string | undefined): MnCard[] {
  return filterCardsByQuery(cards, query)
}

export function createBridgeAdapter(): MnAdapter {
  let connection: MnConnection = { state: 'connecting' }
  let topicId: string | null = null
  let live = false
  let eventsBound = false
  let requestSeq = 0
  const connectionListeners = new Set<() => void>()
  const changeListeners = new Set<() => void>()

  const setConnection = (next: MnConnection) => {
    if (JSON.stringify(next) === JSON.stringify(connection)) return
    connection = next
    for (const listener of connectionListeners) listener()
  }

  const bindEvents = () => {
    if (eventsBound) return
    const bridge = window.mn
    if (!bridge?.on) return
    eventsBound = true
    for (const event of LIVE_EVENTS) {
      try {
        bridge.on(event, () => {
          if (!live) {
            live = true
            if (connection.state === 'connected') setConnection({ ...connection, live: true })
          }
          for (const listener of changeListeners) listener()
        })
      } catch {
        // 未在插件清单里声明的事件收不到推送，按静默模式继续。
      }
    }
  }

  const readTopicTitle = async (activeTopic: string): Promise<string | undefined> => {
    try {
      const context = await callBridge<ContextResponse>('/context', undefined, 2_500)
      const studySet = context.studySet
      if (studySet?.topicid === activeTopic) return studySet.title?.trim() || undefined
    } catch {
      // 旧版 MarginNote 没有 /context，学习集标题按缺省处理。
    }
    return undefined
  }

  return {
    kind: 'bridge',
    async listCards(query?: string) {
      const seq = requestSeq + 1
      requestSeq = seq
      const commit = (next: MnConnection) => {
        if (seq === requestSeq) setConnection(next)
      }

      try {
        if (connection.state !== 'connected') commit({ state: 'connecting' })
        const capabilities = await readCapabilities()
        if (!supportsRoute(capabilities, 'GET', '/study-sets/{id}/tree')) {
          commit({
            state: 'error',
            message: '当前 MarginNote 版本缺少学习集接口，请更新 MarginNote',
          })
          return []
        }

        const ui = await callBridge<UiState>('/ui-state')
        const activeTopic = ui.state?.topicid
        if (!activeTopic) {
          topicId = null
          commit({ state: 'empty', reason: '打开一个学习集后，卡片会出现在这里' })
          return []
        }

        topicId = activeTopic
        const [topicTitle, loaded] = await Promise.all([
          readTopicTitle(activeTopic),
          loadStudySetCards(activeTopic, capabilities),
        ])
        bindEvents()
        commit({
          state: 'connected',
          topicId: activeTopic,
          topicTitle,
          apiVersion: capabilities.bridgeApiVersion,
          cardCount: loaded.cards.length,
          truncated: loaded.truncated,
          live,
        })
        return filterCards(loaded.cards, query?.trim().toLowerCase())
      } catch (error) {
        commit({ state: 'error', message: describeError(error) })
        return []
      }
    },
    async getCards(ids: string[]) {
      try {
        return await loadCards(ids, topicId ?? undefined)
      } catch {
        return []
      }
    },
    async getSelectedCardIds() {
      if (nativeBridgeAvailable()) {
        try {
          const result = await callNative<{ noteIds?: string[] }>('selection:list')
          const ids = Array.isArray(result?.noteIds) ? result.noteIds : []
          return ids.map((id) => String(id).trim()).filter(Boolean)
        } catch {
          // 原生选区读取失败时回落到界面状态接口。
        }
      }
      try {
        const ui = await callBridge<UiState>('/ui-state')
        const focused = ui.state?.focusnoteid?.trim()
        return focused ? [focused] : []
      } catch {
        return []
      }
    },
    focusCard(id: string) {
      void callBridge(`/notes/${encodeURIComponent(id)}/focus`, {
        method: 'POST',
        body: topicId ? { topicid: topicId } : {},
      }).catch(() => undefined)
    },
    async searchLibrary(query: string) {
      const trimmed = query.trim()
      if (!trimmed) return { notes: [], documents: [], truncated: false }
      try {
        return await searchLibraryInMn(trimmed)
      } catch {
        // 检索失败时按无结果处理，写作过程不被打断。
        return { notes: [], documents: [], truncated: false }
      }
    },
    async locateDocument(id: string) {
      try {
        await callBridge(`/documents/${encodeURIComponent(id)}/locate`, { method: 'POST' })
        return true
      } catch {
        return false
      }
    },
    getConnection() {
      return connection
    },
    subscribeConnection(listener: () => void) {
      connectionListeners.add(listener)
      return () => connectionListeners.delete(listener)
    },
    subscribeChange(listener: () => void) {
      changeListeners.add(listener)
      return () => changeListeners.delete(listener)
    },
  }
}
