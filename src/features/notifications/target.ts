import { INFRA_SLUG } from '../../config/departments'
import { navigateTo } from '../../lib/navigation'
import { useDeviceStore } from '../../store/deviceStore'
import { useUiStore } from '../../store/uiStore'
import type { Notification } from '../../types/notify'

type Target = NonNullable<Notification['target']>
export const ACTION_LABEL: Record<Target['kind'], string> = { TASK: 'Xem task', GOAL: 'Xem mục tiêu', APPROVAL: 'Mở duyệt', DEVICE: 'Xem thiết bị', BUDGET: 'Xem ngân sách', PROJECT: 'Xem dự án', AGENT: 'Xem agent' }

/** Đi tới đối tượng của thông báo. Các trang task/dự án/ngân sách ra ở các bước sau của Prompt 3C. */
export function goToTarget(t: Target) {
  switch (t.kind) {
    case 'APPROVAL': return useUiStore.getState().openInbox(t.id)
    case 'DEVICE': navigateTo(`/department/${INFRA_SLUG}`); return useDeviceStore.getState().select(t.id)
    case 'GOAL': return navigateTo(`/goals/${t.id}`)
    case 'TASK': return navigateTo(`/kanban?task=${t.id}`)
    case 'BUDGET': return navigateTo('/costs')
    case 'PROJECT': return navigateTo(`/projects/${t.id}`)
    case 'AGENT': return navigateTo(`/agents/${t.id}`)
  }
}
