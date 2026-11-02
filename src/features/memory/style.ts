import type { MemoryOrigin } from '../../types/memory'

// Nguồn gốc ký ức: chữ + màu (huy hiệu có thêm biểu tượng). Mục suy ra từ nội dung bên ngoài là mục RỦI RO nhất.
export const ORIGIN_STYLE: Record<MemoryOrigin, { label: string; color: string; soft: string; hint: string }> = {
  OWNER: { label: 'Chủ nói', color: '#166534', soft: '#dcfce7', hint: 'Do chính bạn dạy agent.' },
  AGENT_OBSERVED: { label: 'Agent quan sát', color: '#1d4ed8', soft: '#dbeafe', hint: 'Agent tự ghi lại từ việc đã làm.' },
  EXTERNAL_INFERRED: { label: 'Suy ra từ nội dung ngoài', color: '#c2410c', soft: '#ffedd5', hint: 'Agent suy ra từ web / thư / tài liệu bên ngoài: có thể sai hoặc bị cài cắm.' },
}
export const KIND_LABEL = { FACT: 'Sự thật', PREFERENCE: 'Sở thích', EVENT: 'Sự kiện', PROCEDURE: 'Quy trình' } as const
export const STATUS_LABEL = { ACTIVE: 'Đang dùng', PENDING_REVIEW: 'Chờ xem xét', REJECTED: 'Đã từ chối', EXPIRED: 'Hết hạn' } as const
export const EXTERNAL_WARNING = 'Mục này suy ra từ nội dung bên ngoài; chỉ duyệt nếu đúng sự thật.'
