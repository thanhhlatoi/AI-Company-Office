import { z } from 'zod'
import { API_BASE_URL, USE_MOCK } from '../lib/config'
import { CollectionSchema, DocumentSchema, EmbeddingModelSchema, EvalQuestionSchema, EvalRunSchema, type CollectionInput, type KnowledgeDoc } from '../types/knowledge'
import { StudioConfigSchema, type StudioConfig } from '../types/studio'
import { ApiError, request } from './http'

// Ghi + tải lên của Kho tài liệu và tab Dữ liệu (Bước 5). Hợp đồng: docs/BE_API_SPEC_PART3.md mục 10.
export const listEmbeddingModels = () => request('GET', '/embedding-models', z.array(EmbeddingModelSchema))
export const postCollection = (b: CollectionInput) => request('POST', '/collections', CollectionSchema, b)
export const putCollection = (id: string, b: CollectionInput) => request('PUT', `/collections/${id}`, CollectionSchema, b)
export const postReindex = (id: string, embeddingModelId: string) => request('POST', `/collections/${id}/reindex`, CollectionSchema, { embeddingModelId })
export const postSyncFolder = (id: string) => request('POST', `/collections/${id}/sync`, z.object({ queued: z.number() }))
export const deleteDocument = (id: string) => request('DELETE', `/documents/${id}`, z.unknown())
export const postReprocess = (id: string) => request('POST', `/documents/${id}/reprocess`, DocumentSchema)
export const postEvalQuestion = (collectionId: string, b: { question: string; expected: string }) => request('POST', `/collections/${collectionId}/eval/questions`, EvalQuestionSchema, b)
export const deleteEvalQuestion = (collectionId: string, qid: string) => request('DELETE', `/collections/${collectionId}/eval/questions/${qid}`, z.unknown())
export const postEvalRun = (collectionId: string, k: number) => request('POST', `/collections/${collectionId}/eval/run`, EvalRunSchema, { k })
export const putStudioConfig = (agentId: string, c: Pick<StudioConfig, 'memoryPolicy' | 'collections' | 'namespaces'>) => request('PUT', `/agents/${agentId}/studio`, StudioConfigSchema, c)
/** Đường dẫn tải xuống (BE thật trả tệp; mock không có tệp thật) */
export const downloadUrl = (docId: string) => `${API_BASE_URL}/documents/${docId}/download`

export interface UploadOptions { onProgress: (pct: number) => void; signal: AbortSignal; trust: KnowledgeDoc['trust'] }
const meta = (f: File, trust: string) => ({ name: f.name, sizeBytes: f.size, mime: f.type, trust })
const aborted = () => new DOMException('Đã huỷ', 'AbortError')

/**
 * Tải MỘT tệp lên bộ sưu tập (hoặc thay bản mới của tài liệu nếu truyền `replaceId`). Có tiến trình và huỷ được.
 * Mock: mô phỏng tiến trình rồi gửi siêu dữ liệu (không có nội dung tệp). BE thật: multipart/form-data qua XHR.
 */
export function uploadFile(collectionId: string, file: File, o: UploadOptions, replaceId?: string): Promise<KnowledgeDoc> {
  const path = replaceId ? `/documents/${replaceId}/replace` : `/collections/${collectionId}/documents`
  if (USE_MOCK) {
    return new Promise((resolve, reject) => {
      let pct = 0
      const done = () => { clearInterval(t); o.signal.removeEventListener('abort', stop) }
      const stop = () => { done(); reject(aborted()) }
      const t = setInterval(() => {
        pct = Math.min(100, pct + 25); o.onProgress(pct)
        if (pct < 100) return
        done()
        void request('POST', path, DocumentSchema, meta(file, o.trust)).then(resolve, reject)
      }, 250)
      o.signal.addEventListener('abort', stop)
      if (o.signal.aborted) stop()
    })
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}${path}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && o.onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.onerror = () => reject(new ApiError(0, 'Mất kết nối khi tải lên'))
    xhr.onabort = () => reject(aborted())
    xhr.onload = () => {
      let body: unknown = null
      try { body = JSON.parse(xhr.responseText) } catch { /* không phải JSON */ }
      const parsed = DocumentSchema.safeParse(body)
      if (xhr.status >= 200 && xhr.status < 300 && parsed.success) resolve(parsed.data)
      else reject(new ApiError(xhr.status, `Tải lên thất bại (HTTP ${xhr.status})`, body))
    }
    o.signal.addEventListener('abort', () => xhr.abort())
    const fd = new FormData(); fd.append('file', file); fd.append('trust', o.trust)
    xhr.send(fd)
  })
}
