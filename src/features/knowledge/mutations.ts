import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDocument, deleteEvalQuestion, postCollection, postEvalQuestion, postEvalRun, postReindex, postReprocess, postSyncFolder, putCollection, putStudioConfig } from '../../api/knowledge'
import { useUiStore } from '../../store/uiStore'
import type { CollectionInput } from '../../types/knowledge'
import type { StudioConfig } from '../../types/studio'
import { errText } from '../studio/mutations'
import { patchDocument } from './cache'

const toast = (t: string, k?: 'success' | 'error') => useUiStore.getState().toast(t, k)
function useRefresh() {
  const qc = useQueryClient()
  return (...keys: string[]) => { for (const k of keys) void qc.invalidateQueries({ queryKey: [k] }) }
}

export function useSaveCollection(id?: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (b: CollectionInput) => (id ? putCollection(id, b) : postCollection(b)),
    onSuccess: () => { toast(id ? 'Đã lưu bộ sưu tập' : 'Đã tạo bộ sưu tập'); refresh('collections', 'studio', 'search') },
    onError: (e) => toast(errText(e, 'Lưu bộ sưu tập thất bại'), 'error'),
  })
}
export function useReindex(id: string) {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (embeddingModelId: string) => postReindex(id, embeddingModelId), onSuccess: () => { toast('Bắt đầu dựng lại chỉ mục'); refresh('collections') }, onError: (e) => toast(errText(e, 'Không dựng lại được chỉ mục'), 'error') })
}
export const useSyncFolder = (id: string) => useMutation({ mutationFn: () => postSyncFolder(id), onSuccess: (r) => toast(`Đã xếp ${r.queued} tệp vào hàng đợi đồng bộ`), onError: (e) => toast(errText(e, 'Đồng bộ thất bại'), 'error') })
export function useDocActions() {
  const refresh = useRefresh(), qc = useQueryClient()
  return {
    remove: useMutation({ mutationFn: deleteDocument, onSuccess: () => { toast('Đã xoá tài liệu'); refresh('documents', 'collections') }, onError: (e) => toast(errText(e, 'Xoá thất bại'), 'error') }),
    reprocess: useMutation({ mutationFn: postReprocess, onSuccess: (d) => { patchDocument(qc, d); toast('Đã đưa vào xử lý lại') }, onError: (e) => toast(errText(e, 'Không xử lý lại được'), 'error') }), // tiến trình về qua document.status_changed
  }
}
export function useEvalActions(collectionId: string) {
  const refresh = useRefresh()
  return {
    add: useMutation({ mutationFn: (b: { question: string; expected: string }) => postEvalQuestion(collectionId, b), onSuccess: () => refresh('eval'), onError: (e) => toast(errText(e, 'Không thêm được câu hỏi'), 'error') }),
    remove: useMutation({ mutationFn: (qid: string) => deleteEvalQuestion(collectionId, qid), onSuccess: () => refresh('eval') }),
    run: useMutation({ mutationFn: (k: number) => postEvalRun(collectionId, k), onSuccess: () => { toast('Đã chạy kiểm thử truy hồi'); refresh('eval') }, onError: (e) => toast(errText(e, 'Chạy kiểm thử thất bại'), 'error') }),
  }
}
export function useSaveStudioData(agentId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (c: Pick<StudioConfig, 'memoryPolicy' | 'collections' | 'namespaces'>) => putStudioConfig(agentId, c),
    onSuccess: () => { toast('Đã lưu cấu hình dữ liệu'); refresh('studio', 'collections', 'search') },
    onError: (e) => toast(errText(e, 'Lưu cấu hình dữ liệu thất bại'), 'error'),
  })
}
