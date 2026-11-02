import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTemplate, postCloneTemplate, postImportTemplate, postInstantiate, postSaveAsTemplate } from '../../api/templates'
import { useUiStore } from '../../store/uiStore'
import { errText } from '../studio/mutations'

const toast = (t: string, k?: 'success' | 'error') => useUiStore.getState().toast(t, k)
function useRefresh() {
  const qc = useQueryClient()
  return (...keys: string[]) => { for (const k of keys) void qc.invalidateQueries({ queryKey: [k] }) }
}

export function useTemplateActions() {
  const refresh = useRefresh()
  return {
    clone: useMutation({ mutationFn: postCloneTemplate, onSuccess: (t) => { toast(`Đã nhân bản thành “${t.name}”`); refresh('templates') }, onError: (e) => toast(errText(e, 'Nhân bản thất bại'), 'error') }),
    remove: useMutation({ mutationFn: deleteTemplate, onSuccess: () => { toast('Đã xoá mẫu'); refresh('templates') }, onError: (e) => toast(errText(e, 'Xoá mẫu thất bại'), 'error') }),
    import: useMutation({ mutationFn: postImportTemplate, onSuccess: (t) => { toast(`Đã nhập mẫu “${t.name}” (mọi quyền chỉ ở dạng đề xuất)`); refresh('templates') }, onError: (e) => toast(errText(e, 'Nhập mẫu thất bại'), 'error') }),
  }
}
/** Tạo agent từ mẫu: một giao dịch. Mọi quyền đã tick nằm trong cùng request. */
export function useInstantiate(templateId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (b: Parameters<typeof postInstantiate>[1]) => postInstantiate(templateId, b),
    onSuccess: () => refresh('agents', 'templates', 'grants', 'effective', 'tools', 'collections', 'namespaces', 'budgets', 'model-policy'),
    onError: (e) => toast(errText(e, 'Tạo agent thất bại'), 'error'),
  })
}
export function useSaveAsTemplate(agentId: string) {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (b: Parameters<typeof postSaveAsTemplate>[1]) => postSaveAsTemplate(agentId, b), onSuccess: (t) => { toast(`Đã lưu thành mẫu “${t.name}”`); refresh('templates') }, onError: (e) => toast(errText(e, 'Lưu thành mẫu thất bại'), 'error') })
}
