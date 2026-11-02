import { useMutation, useQueryClient } from '@tanstack/react-query'
import { checkTool, deleteSecret, postRotateSecret, postSecret, previewPermissions, putGrants, putTool } from '../../api/studio'
import { useUiStore } from '../../store/uiStore'
import type { PermissionChange } from '../../types/tools'
import { errText } from './mutations'

const toast = (t: string, k?: 'success' | 'error') => useUiStore.getState().toast(t, k)
function useRefresh() {
  const qc = useQueryClient()
  return (...keys: string[]) => { for (const k of keys) void qc.invalidateQueries({ queryKey: [k] }) }
}

export const usePreviewPermissions = (agentId: string) => useMutation({ mutationFn: (c: PermissionChange) => previewPermissions(agentId, c), onError: (e) => toast(errText(e, 'Không xem trước được thay đổi'), 'error') })
export function useSaveGrants(agentId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (c: PermissionChange) => putGrants(agentId, c),
    onSuccess: () => { toast('Đã lưu quyền'); refresh('grants', 'effective', 'tools', 'audit', 'secrets') },
    onError: (e) => toast(errText(e, 'Lưu quyền thất bại'), 'error'),
  })
}
export const useCheck = () => useMutation({ mutationFn: ({ toolId, agentId, args }: { toolId: string; agentId: string; args: Record<string, unknown> }) => checkTool(toolId, agentId, args), onError: (e) => toast(errText(e, 'Không thử được quyền'), 'error') })

export function useToolSwitch() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ toolId, change }: { toolId: string; change: { enabled?: boolean; adminFlagOn?: boolean; reason?: string } }) => putTool(toolId, change),
    onSuccess: (t, v) => { toast(v.change.enabled === false ? `Đã TẮT KHẨN CẤP "${t.name}"` : v.change.enabled ? `Đã bật lại "${t.name}"` : `Đã đổi cờ xác nhận của "${t.name}"`); refresh('tools', 'effective', 'grants', 'audit') },
    onError: (e) => toast(errText(e, 'Đổi công tắc thất bại'), 'error'),
  })
}
export function useSecretMutations() {
  const refresh = useRefresh()
  const ok = (m: string) => () => { toast(m); refresh('secrets') }
  return {
    create: useMutation({ mutationFn: postSecret, onSuccess: ok('Đã tạo bí mật'), onError: (e) => toast(errText(e, 'Tạo bí mật thất bại'), 'error') }),
    rotate: useMutation({ mutationFn: ({ id, value }: { id: string; value: string }) => postRotateSecret(id, value), onSuccess: ok('Đã xoay bí mật'), onError: (e) => toast(errText(e, 'Xoay bí mật thất bại'), 'error') }),
    remove: useMutation({ mutationFn: deleteSecret, onSuccess: ok('Đã xoá bí mật') }), // lỗi 409 để hộp thoại tự hiện danh sách đang dùng
  }
}
