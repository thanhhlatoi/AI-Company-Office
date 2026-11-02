import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { postEstimate, postModel, postModelCheck, postRunComparison, postSaveComparison, postSimulate, putModel, putRoutingRules } from '../../api/studio'
import { useUiStore } from '../../store/uiStore'
import type { ModelProfileInput } from '../../types/models'
import { errText } from '../studio/mutations'

const toast = (t: string, k?: 'success' | 'error') => useUiStore.getState().toast(t, k)
function useRefresh() {
  const qc = useQueryClient()
  return (...keys: string[]) => { for (const k of keys) void qc.invalidateQueries({ queryKey: [k] }) }
}

export function useSaveModel(id?: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (b: ModelProfileInput) => (id ? putModel(id, b) : postModel(b)),
    onSuccess: () => { toast(id ? 'Đã lưu hồ sơ model' : 'Đã thêm hồ sơ model'); refresh('models', 'model-policy') },
    onError: (e) => toast(errText(e, 'Lưu hồ sơ model thất bại'), 'error'),
  })
}
export function useCheckModel() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: postModelCheck, onSuccess: () => refresh('models', 'model-policy'), onError: (e) => toast(errText(e, 'Không kiểm tra được kết nối'), 'error') })
}
export function useSaveRules() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: putRoutingRules, onSuccess: () => { toast('Đã lưu luật định tuyến'); refresh('routing-rules') }, onError: (e) => toast(errText(e, 'Lưu luật thất bại'), 'error') })
}
export const useSimulate = () => useMutation({ mutationFn: postSimulate, onError: (e) => toast(errText(e, 'Không mô phỏng được'), 'error') })

/** Ước tính chi phí TRƯỚC khi chạy so sánh (BE tính từ giá model) */
export const useEstimate = (prompt: string, modelIds: string[]) =>
  useQuery({ queryKey: ['comparison-estimate', prompt, modelIds], queryFn: () => postEstimate({ prompt, modelIds }), enabled: prompt.trim().length > 0 && modelIds.length >= 2 })
export const useRunComparison = () => useMutation({ mutationFn: postRunComparison, onError: (e) => toast(errText(e, 'Chạy so sánh thất bại'), 'error') })
export function useSaveComparison() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: postSaveComparison, onSuccess: () => { toast('Đã lưu so sánh'); refresh('comparisons') }, onError: (e) => toast(errText(e, 'Lưu so sánh thất bại'), 'error') })
}
