import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteMemory, postBulkReview, postForget, postForgetPreview, postReview, putMemory, putNamespace } from '../../api/memory'
import { useUiStore } from '../../store/uiStore'
import type { MemoryEdit, NamespaceConfig } from '../../types/memory'
import { errText } from '../studio/mutations'

const toast = (t: string, k?: 'success' | 'error') => useUiStore.getState().toast(t, k)
function useRefresh() {
  const qc = useQueryClient()
  return () => { for (const k of ['memory', 'namespaces']) void qc.invalidateQueries({ queryKey: [k] }) }
}

export function useMemoryActions() {
  const refresh = useRefresh()
  return {
    edit: useMutation({ mutationFn: ({ id, e }: { id: string; e: MemoryEdit }) => putMemory(id, e), onSuccess: refresh, onError: (e) => toast(errText(e, 'Lưu ký ức thất bại'), 'error') }),
    remove: useMutation({ mutationFn: deleteMemory, onSuccess: () => { toast('Đã xoá ký ức'); refresh() }, onError: (e) => toast(errText(e, 'Xoá thất bại'), 'error') }),
    review: useMutation({ mutationFn: ({ id, decision, content }: { id: string; decision: 'APPROVE' | 'REJECT'; content?: string }) => postReview(id, { decision, content }), onSuccess: (_i, v) => { toast(v.decision === 'APPROVE' ? 'Đã duyệt ký ức' : 'Đã từ chối ký ức'); refresh() }, onError: (e) => toast(errText(e, 'Xem xét thất bại'), 'error') }),
    bulk: useMutation({ mutationFn: ({ ids, decision }: { ids: string[]; decision: 'APPROVE' | 'REJECT' }) => postBulkReview(ids, decision), onSuccess: (r, v) => { toast(`Đã ${v.decision === 'APPROVE' ? 'duyệt' : 'từ chối'} ${r.updated} ký ức`); refresh() }, onError: (e) => toast(errText(e, 'Xem xét hàng loạt thất bại'), 'error') }),
  }
}
export const useForgetPreview = () => useMutation({ mutationFn: postForgetPreview, onError: (e) => toast(errText(e, 'Không xem trước được'), 'error') })
export function useForget() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: postForget, onSuccess: (r) => { toast(`Đã quên ${r.deleted} ký ức`); refresh() }, onError: (e) => toast(errText(e, 'Quên thất bại'), 'error') })
}
export function useSaveNamespace() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: ({ id, c }: { id: string; c: NamespaceConfig }) => putNamespace(id, c), onSuccess: () => { toast('Đã lưu không gian tên'); refresh() }, onError: (e) => toast(errText(e, 'Lưu không gian tên thất bại'), 'error') })
}
