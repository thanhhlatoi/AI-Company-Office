import type { Task } from '../../types'
import type { KanbanColumnId, MoveReason } from '../../types/kanban'

export interface ColumnDef { id: KanbanColumnId; label: string; color: string; soft: string }
// "Lỗi / Huỷ" là cột phụ, thu gọn mặc định
export const COLUMNS: ColumnDef[] = [
  { id: 'QUEUED', label: 'Chờ', color: '#475569', soft: '#f1f5f9' },
  { id: 'RUNNING', label: 'Đang làm', color: '#1d4ed8', soft: '#dbeafe' },
  { id: 'AWAITING_APPROVAL', label: 'Chờ duyệt', color: '#92400e', soft: '#ffedd5' },
  { id: 'DONE', label: 'Xong', color: '#166534', soft: '#dcfce7' },
  { id: 'FAILED_CANCELLED', label: 'Lỗi / Huỷ', color: '#b91c1c', soft: '#fee2e2' },
]
export const columnLabel = (id: KanbanColumnId) => COLUMNS.find((c) => c.id === id)?.label ?? id

export function columnOf(s: Task['status']): KanbanColumnId {
  if (s === 'QUEUED' || s === 'WAITING_BUDGET') return 'QUEUED'
  if (s === 'RUNNING' || s === 'AWAITING_APPROVAL' || s === 'DONE') return s
  return 'FAILED_CANCELLED'
}

/** Thẻ khoá (chờ duyệt) không kéo được: duyệt qua hộp thoại, không duyệt bằng kéo. */
export const canDrag = (t: Task) => !t.locked && t.status !== 'AWAITING_APPROVAL'
export const cancellable = (t: Task) => t.status === 'QUEUED' || t.status === 'WAITING_BUDGET' || t.status === 'RUNNING'
export const redoable = (t: Task) => t.status === 'DONE' || t.status === 'FAILED' || t.status === 'CANCELLED'

/** GỢI Ý (không chặn): cột nào có vẻ nhận được thẻ đang kéo. BACKEND mới quyết định. */
export function hintAllows(t: Task, to: KanbanColumnId): boolean {
  const from = columnOf(t.status)
  if (to === 'QUEUED') return from === 'QUEUED' || redoable(t)
  if (to === 'RUNNING') return from === 'QUEUED' && t.status === 'QUEUED'
  return false
}

export const REASON_TEXT: Record<MoveReason, string> = {
  DEPENDENCIES_PENDING: 'Chưa chạy được: còn việc phụ thuộc chưa xong.',
  NOT_SUPPORTED: 'Hệ thống không hỗ trợ thao tác kéo này.',
  USE_APPROVAL_DIALOG: 'Việc này cần duyệt qua hộp thoại phê duyệt, không duyệt bằng kéo.',
  NOT_ALLOWED: 'Không được phép chuyển thẻ sang cột này.',
  STALE_VERSION: 'Thẻ vừa được thay đổi ở nơi khác. Đã tải lại cột, hãy thử lại.',
}
