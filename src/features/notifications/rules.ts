/** Các loại sự kiện có thể đặt quy tắc thông báo (khoá = `type` của Notification). Thứ tự = thứ tự hiển thị. */
export const NOTIFY_TYPES: { type: string; label: string }[] = [
  { type: 'goal.done', label: 'Mục tiêu hoàn tất' },
  { type: 'task.failed', label: 'Task lỗi hẳn (hết số lần thử)' },
  { type: 'task.done', label: 'Task xong' },
  { type: 'approval.requested', label: 'Cần duyệt' },
  { type: 'budget.soft', label: 'Ngân sách chạm ngưỡng cảnh báo' },
  { type: 'budget.hard', label: 'Ngân sách hết hạn mức' },
  { type: 'device.offline', label: 'Thiết bị mất kết nối' },
]
export const typeLabel = (type: string) => NOTIFY_TYPES.find((t) => t.type === type)?.label ?? type
