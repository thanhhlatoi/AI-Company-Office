import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postDepartmentHead, postLint, postModelTest, postPromptVersion, postRestoreVersion, postTemplateSync, putModelPolicy, type TemplatePart } from '../../api/studio'
import { ApiError } from '../../api/http'
import { useUiStore } from '../../store/uiStore'
import type { ModelPolicyInput } from '../../types/models'

const toast = (t: string, k?: 'success' | 'error') => useUiStore.getState().toast(t, k)
/** Lý do lỗi từ BE (`{message}`) nếu có, để hiện cho người dùng thay vì "thất bại" chung chung */
export const errText = (e: unknown, fallback: string) => (e instanceof ApiError && e.body && typeof (e.body as { message?: unknown }).message === 'string' ? (e.body as { message: string }).message : fallback)

function useRefresh() {
  const qc = useQueryClient()
  return (...keys: string[]) => { for (const k of keys) void qc.invalidateQueries({ queryKey: [k] }) }
}

export function useSavePrompt(agentId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ prompt, note }: { prompt: string; note: string }) => postPromptVersion(agentId, prompt, note),
    onSuccess: (v) => { toast(`Đã lưu prompt (phiên bản ${v.version})`); refresh('prompt-versions', 'agents') },
    onError: (e) => toast(errText(e, 'Lưu prompt thất bại'), 'error'),
  })
}
export function useRestoreVersion(agentId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (versionId: string) => postRestoreVersion(agentId, versionId),
    onSuccess: (v) => { toast(`Đã khôi phục thành phiên bản ${v.version}`); refresh('prompt-versions', 'agents') },
    onError: (e) => toast(errText(e, 'Khôi phục thất bại'), 'error'),
  })
}
export const useLint = () => useMutation({ mutationFn: postLint, onError: () => toast('Không kiểm tra được prompt', 'error') })

export function useSavePolicy(agentId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (p: ModelPolicyInput) => putModelPolicy(agentId, p),
    onSuccess: () => { toast('Đã lưu cấu hình model'); refresh('model-policy', 'effective', 'agents') },
    onError: (e) => toast(errText(e, 'Lưu cấu hình model thất bại'), 'error'),
  })
}
export const useTestModel = () => useMutation({ mutationFn: ({ modelId, prompt }: { modelId: string; prompt: string }) => postModelTest(modelId, prompt), onError: (e) => toast(errText(e, 'Thử model thất bại'), 'error') })

export function useTemplateSync(agentId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (parts: TemplatePart[]) => postTemplateSync(agentId, parts),
    onSuccess: (_d, parts) => { toast(parts.length ? 'Đã áp dụng phần đã chọn của mẫu' : 'Đã bỏ qua bản mẫu mới'); refresh('studio', 'prompt-versions', 'agents', 'model-policy', 'templates') },
    onError: (e) => toast(errText(e, 'Đồng bộ mẫu thất bại'), 'error'),
  })
}
export function useSetHead() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ departmentId, agentId }: { departmentId: string; agentId: string }) => postDepartmentHead(departmentId, agentId),
    onSuccess: () => { toast('Đã đổi trưởng phòng'); refresh('agents', 'departments') },
    onError: (e) => toast(errText(e, 'Đổi trưởng phòng thất bại'), 'error'),
  })
}
