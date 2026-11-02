import type { GoalStatus, Priority, TaskStatus } from '../../types'

export const TASK_STYLE: Record<TaskStatus, { label: string; color: string; soft: string }> = {
  QUEUED: { label: 'Chờ', color: '#475569', soft: '#f1f5f9' },
  WAITING_BUDGET: { label: 'Chờ ngân sách', color: '#854d0e', soft: '#fef3c7' },
  AWAITING_APPROVAL: { label: 'Chờ duyệt', color: '#92400e', soft: '#ffedd5' },
  RUNNING: { label: 'Đang chạy', color: '#1d4ed8', soft: '#dbeafe' },
  DONE: { label: 'Xong', color: '#166534', soft: '#dcfce7' },
  FAILED: { label: 'Lỗi', color: '#b91c1c', soft: '#fee2e2' },
  CANCELLED: { label: 'Đã huỷ', color: '#6b7280', soft: '#f3f4f6' },
}

export const GOAL_STYLE: Record<GoalStatus, { label: string; color: string; soft: string }> = {
  PLANNING: { label: 'Đang lập kế hoạch', color: '#6d28d9', soft: '#ede9fe' },
  AWAITING_PLAN_APPROVAL: { label: 'Chờ duyệt kế hoạch', color: '#92400e', soft: '#fef3c7' },
  RUNNING: { label: 'Đang chạy', color: '#1d4ed8', soft: '#dbeafe' },
  DONE: { label: 'Hoàn tất', color: '#166534', soft: '#dcfce7' },
  FAILED: { label: 'Thất bại', color: '#b91c1c', soft: '#fee2e2' },
  CANCELLED: { label: 'Đã huỷ', color: '#6b7280', soft: '#f3f4f6' },
  REJECTED: { label: 'Kế hoạch bị từ chối', color: '#6b7280', soft: '#f3f4f6' },
}

/** Huy hiệu ưu tiên: khác nhau cả về chữ, ký hiệu và màu (không chỉ dựa vào màu). */
export const PRIORITY_STYLE: Record<Priority, { label: string; mark: string; color: string; soft: string; solid: boolean }> = {
  HIGH: { label: 'Cao', mark: '▲', color: '#ffffff', soft: '#dc2626', solid: true },
  NORMAL: { label: 'Thường', mark: '●', color: '#334155', soft: '#e2e8f0', solid: false },
  LOW: { label: 'Thấp', mark: '▼', color: '#0369a1', soft: '#e0f2fe', solid: false },
}

/** Việc đã kết thúc (không còn đổi trạng thái nữa). */
export const isTerminalGoal = (s: GoalStatus) => s === 'DONE' || s === 'FAILED' || s === 'CANCELLED' || s === 'REJECTED'
