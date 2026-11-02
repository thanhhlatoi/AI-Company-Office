import type { AgentStatus } from '../../types/index.ts'

const TEXT: Partial<Record<AgentStatus, string>> = { ERROR: 'gặp lỗi', BLOCKED: 'bị chặn', OFFLINE: 'ngoại tuyến' }

/** Thông báo cho trình đọc màn hình khi agent CHUYỂN SANG trạng thái quan trọng (lỗi / bị chặn / ngoại tuyến); đổi giữa các trạng thái thường thì im lặng. */
export const statusChangeMessage = (name: string, prev: AgentStatus | undefined, next: AgentStatus): string | null =>
  prev !== undefined && prev !== next && TEXT[next] ? `${name}: ${TEXT[next]}` : null

export const approvalMessage = (name: string) => `${name}: chờ duyệt`

/** Gộp nhiều thông báo trong một nhịp để không đọc dồn dập. */
export function summarize(messages: string[], max = 3): string {
  if (messages.length <= max) return messages.join('. ')
  return `${messages.slice(0, max).join('. ')}. Và ${messages.length - max} thông báo khác`
}
