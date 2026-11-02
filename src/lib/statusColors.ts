import type { AgentStatus } from '../types'

// Nguồn màu trạng thái DUY NHẤT, dùng chung cho canvas (hex) và panel (CSS).
export const STATUS_STYLE: Record<AgentStatus, { color: string; soft: string; label: string }> = {
  IDLE: { color: '#166534', soft: '#dcfce7', label: 'Sẵn sàng nhận việc' },
  WORKING: { color: '#854d0e', soft: '#fef9c3', label: 'Đang làm' },
  BLOCKED: { color: '#b91c1c', soft: '#fee2e2', label: 'Bị chặn' },
  ERROR: { color: '#b91c1c', soft: '#fee2e2', label: 'Lỗi' },
  OFFLINE: { color: '#6b7280', soft: '#f3f4f6', label: 'Ngoại tuyến' },
}

/** Chữ hiển thị trong pill: WORKING kèm tên task rút gọn 20 ký tự. */
export function statusLabel(status: AgentStatus, task: { title: string } | null): string {
  if (status !== 'WORKING' || !task) return STATUS_STYLE[status].label
  const t = task.title.length > 20 ? `${task.title.slice(0, 20)}…` : task.title
  return `${STATUS_STYLE.WORKING.label}: ${t}`
}
