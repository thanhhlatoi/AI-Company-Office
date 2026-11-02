import { useState } from 'react'
import type { EffectivePermissions, PermissionChange } from '../../types/tools'
import { describeChange, touchesHighRisk } from './grantRules'
import { useSaveGrants, usePreviewPermissions } from './toolMutations'
import { useEffective, useTools } from './queries'

/**
 * Luồng đổi quyền: xem trước ("Sau thay đổi agent này sẽ có thể...") -> xác nhận (hai bước với MONEY/DESTRUCTIVE, lý do tuỳ chọn) -> lưu.
 * `onDone`: gọi sau khi lưu thành công (để đóng hộp thoại chỉnh). `onPreview` báo bản xem trước (hoặc undefined khi kết thúc) cho panel "Agent này làm được gì".
 */
export function useChangeFlow(agentId: string, onPreview: (p?: EffectivePermissions) => void, onDone?: () => void) {
  const [pending, setPending] = useState<{ change: PermissionChange; after: EffectivePermissions } | null>(null)
  const before = useEffective(agentId).data, tools = useTools().data ?? []
  const preview = usePreviewPermissions(agentId), save = useSaveGrants(agentId)
  const toolIds = pending ? [...pending.change.grants.map((g) => g.toolId), ...pending.change.remove] : []
  const cancel = () => { setPending(null); onPreview(undefined) }
  return {
    pending: !!pending,
    busy: preview.isPending || save.isPending,
    lines: pending && before ? describeChange(before, pending.after, tools) : [],
    twoStep: touchesHighRisk(toolIds, tools),
    start: (change: PermissionChange) => preview.mutate(change, { onSuccess: (after) => { setPending({ change, after }); onPreview(after) } }),
    cancel,
    commit: (reason: string) => { if (pending) save.mutate({ ...pending.change, reason: reason || undefined }, { onSuccess: () => { cancel(); onDone?.() } }) },
  }
}
export type ChangeFlow = ReturnType<typeof useChangeFlow>
