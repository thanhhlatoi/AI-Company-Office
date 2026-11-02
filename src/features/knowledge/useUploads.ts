import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { uploadFile } from '../../api/knowledge'
import type { KnowledgeDoc } from '../../types/knowledge'
import { errText } from '../studio/mutations'
import { checkFile } from './files'
import { patchDocument } from './cache'

export interface UploadItem { key: number; name: string; size: number; status: 'uploading' | 'done' | 'error' | 'canceled'; pct: number; error?: string }
let seq = 0

/**
 * Hàng đợi tải lên: kiểm tra tệp ở trình duyệt, tải tuần tự từng tệp (có tiến trình, huỷ, thử lại).
 * Đối tượng File chỉ được giữ trong ref khi chưa xong (để thử lại) và bị bỏ ngay khi tải xong / huỷ.
 */
export function useUploads(collectionId: string, trust: KnowledgeDoc['trust']) {
  const [items, setItems] = useState<UploadItem[]>([])
  const files = useRef(new Map<number, File>()), replaces = useRef(new Map<number, string>()), ctrls = useRef(new Map<number, AbortController>())
  const qc = useQueryClient()
  const patch = (key: number, p: Partial<UploadItem>) => setItems((l) => l.map((x) => (x.key === key ? { ...x, ...p } : x)))

  const send = useCallback(async (key: number) => {
    const file = files.current.get(key); if (!file) return
    const ctrl = new AbortController(); ctrls.current.set(key, ctrl)
    patch(key, { status: 'uploading', pct: 0, error: undefined })
    try {
      const doc = await uploadFile(collectionId, file, { signal: ctrl.signal, trust, onProgress: (pct) => patch(key, { pct }) }, replaces.current.get(key))
      patchDocument(qc, doc); void qc.invalidateQueries({ queryKey: ['collections'] })
      files.current.delete(key); patch(key, { status: 'done', pct: 100 })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') { files.current.delete(key); patch(key, { status: 'canceled' }) }
      else patch(key, { status: 'error', error: errText(e, 'Tải lên thất bại') })
    } finally { ctrls.current.delete(key) }
  }, [collectionId, trust, qc])

  /** `replaceId`: tải bản MỚI thay cho tài liệu đó (giữ nguyên chỗ, tăng phiên bản) */
  const add = useCallback((list: File[], replaceId?: string) => {
    for (const f of list) {
      const key = ++seq, bad = checkFile(f.name, f.size)
      setItems((l) => [...l, { key, name: f.name, size: f.size, status: bad ? 'error' : 'uploading', pct: 0, error: bad ?? undefined }])
      if (!bad) { files.current.set(key, f); if (replaceId) replaces.current.set(key, replaceId); void send(key) }
    }
  }, [send])
  return {
    items, add,
    cancel: (key: number) => ctrls.current.get(key)?.abort(),
    retry: (key: number) => void send(key),
    dismiss: (key: number) => { files.current.delete(key); setItems((l) => l.filter((x) => x.key !== key)) },
  }
}
