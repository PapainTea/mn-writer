import type { JSONContent } from '@tiptap/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EMPTY_DOC } from '../lib/document'
import {
  createId,
  loadActiveId,
  loadDocuments,
  persistActiveId,
  persistDocuments,
} from '../lib/storage'
import type { WriterDocument } from '../types'

export type SaveState = 'saved' | 'saving' | 'idle' | 'error'

function uniqueTitle(documents: WriterDocument[], title: string): string {
  const titles = new Set(documents.map((document) => document.title))
  if (!titles.has(title)) return title
  let index = 2
  while (titles.has(`${title}（${index}）`)) index += 1
  return `${title}（${index}）`
}

export function useWriterDocuments(onStorageFailure: () => void) {
  const [documents, setDocuments] = useState<WriterDocument[]>(() => loadDocuments())
  const [activeId, setActiveId] = useState<string>(() => loadActiveId(loadDocuments()))
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const documentsRef = useRef(documents)
  const saveTimer = useRef<number | null>(null)
  const pendingContent = useRef<JSONContent | null>(null)
  const storageWarned = useRef(false)

  useEffect(() => {
    documentsRef.current = documents
  }, [documents])

  const activeDocument = documents.find((doc) => doc.id === activeId) ?? documents[0]
  const activeDocumentId = activeDocument?.id ?? ''

  const getDocument = useCallback(
    (id: string) => documentsRef.current.find((doc) => doc.id === id),
    [],
  )

  const notifyStorageFailure = useCallback(() => {
    setSaveState('error')
    if (storageWarned.current) return
    storageWarned.current = true
    onStorageFailure()
  }, [onStorageFailure])

  const commitContent = useCallback(
    (content: JSONContent): boolean => {
      if (!activeDocumentId) return false
      const next = documentsRef.current.map((doc) =>
        doc.id === activeDocumentId ? { ...doc, content, updatedAt: Date.now() } : doc,
      )
      documentsRef.current = next
      setDocuments(next)
      if (persistDocuments(next)) {
        storageWarned.current = false
        setSaveState('saved')
        return true
      } else {
        notifyStorageFailure()
        return false
      }
    },
    [activeDocumentId, notifyStorageFailure],
  )

  const flushSave = useCallback(() => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const content = pendingContent.current
    if (content && activeDocumentId) {
      pendingContent.current = null
      return commitContent(content)
    }
    if (persistDocuments(documentsRef.current)) {
      storageWarned.current = false
      setSaveState('saved')
      return true
    }
    notifyStorageFailure()
    return false
  }, [activeDocumentId, commitContent, notifyStorageFailure])

  const scheduleSave = useCallback(
    (content: JSONContent, quiet = false) => {
      pendingContent.current = content
      if (!quiet) setSaveState('saving')
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null
        const next = pendingContent.current
        if (!next || !activeDocumentId) return
        pendingContent.current = null
        commitContent(next)
      }, 500)
    },
    [activeDocumentId, commitContent],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (persistDocuments(documents)) {
        storageWarned.current = false
        setSaveState((current) => (current === 'error' ? 'saved' : current))
        return
      }
      notifyStorageFailure()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [documents, notifyStorageFailure])

  useEffect(() => {
    const persistNow = () => {
      const content = pendingContent.current
      let snapshot = documentsRef.current
      if (content && activeDocumentId) {
        snapshot = snapshot.map((doc) =>
          doc.id === activeDocumentId ? { ...doc, content, updatedAt: Date.now() } : doc,
        )
        documentsRef.current = snapshot
        pendingContent.current = null
      }
      persistDocuments(snapshot)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persistNow()
    }
    window.addEventListener('beforeunload', persistNow)
    window.addEventListener('pagehide', persistNow)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('beforeunload', persistNow)
      window.removeEventListener('pagehide', persistNow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [activeDocumentId])

  const selectDocument = useCallback(
    (id: string) => {
      flushSave()
      setActiveId(id)
      persistActiveId(id)
    },
    [flushSave],
  )

  const addDocument = useCallback((title: string, content: JSONContent) => {
    flushSave()
    const now = Date.now()
    const doc: WriterDocument = {
      id: createId('doc'),
      title,
      content,
      createdAt: now,
      updatedAt: now,
    }
    const next = [doc, ...documentsRef.current]
    documentsRef.current = next
    setDocuments(next)
    setActiveId(doc.id)
    persistActiveId(doc.id)
    return doc
  }, [flushSave])

  const newDocument = useCallback(() => {
    return addDocument('未命名文稿', EMPTY_DOC)
  }, [addDocument])

  const importDocument = useCallback(
    (title: string, content: JSONContent) => {
      return addDocument(uniqueTitle(documentsRef.current, title), content)
    },
    [addDocument],
  )

  const deleteDocument = useCallback(
    (id: string) => {
      const target = documents.find((doc) => doc.id === id)
      if (!target) return
      if (!window.confirm(`删除「${target.title || '未命名文稿'}」？此操作不可撤销。`)) return
      flushSave()
      const remaining = documentsRef.current.filter((doc) => doc.id !== id)
      if (remaining.length > 0) {
        documentsRef.current = remaining
        setDocuments(remaining)
        const nextActive = remaining[0]
        if (id === activeId && nextActive) {
          setActiveId(nextActive.id)
          persistActiveId(nextActive.id)
        }
        return
      }
      const now = Date.now()
      const fresh: WriterDocument = {
        id: createId('doc'),
        title: '未命名文稿',
        content: EMPTY_DOC,
        createdAt: now,
        updatedAt: now,
      }
      documentsRef.current = [fresh]
      setDocuments([fresh])
      setActiveId(fresh.id)
      persistActiveId(fresh.id)
    },
    [activeId, documents, flushSave],
  )

  const renameDocument = useCallback(
    (title: string) => {
      const next = documentsRef.current.map((doc) =>
        doc.id === activeId ? { ...doc, title, updatedAt: Date.now() } : doc,
      )
      documentsRef.current = next
      setDocuments(next)
    },
    [activeId],
  )

  return {
    documents,
    activeId,
    activeDocument,
    activeDocumentId,
    getDocument,
    saveState,
    flushSave,
    scheduleSave,
    selectDocument,
    newDocument,
    importDocument,
    deleteDocument,
    renameDocument,
  }
}
