const PRIVATE_V4 = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./]

/** localhost, IP riêng (LAN), hoặc tên đơn không có dấu chấm (vd tên service docker). 169.254.x (metadata cloud) KHÔNG tính là riêng. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === 'localhost' || h === '[::1]' || h.endsWith('.local') || PRIVATE_V4.some((r) => r.test(h)) || (!h.includes('.') && !h.includes(':') && h !== '')
}

/**
 * Kiểm tra địa chỉ ở FE chỉ là gợi ý UX. Chặn SSRF thật (danh sách địa chỉ tin cậy, 169.254.169.254...) phải làm ở BE:
 * người dùng/ script có thể gọi API mà không qua giao diện này.
 */
export function checkBaseUrl(raw: string): { error?: string; warnings: string[] } {
  const v = raw.trim()
  if (!v) return { error: 'Hãy nhập địa chỉ', warnings: [] }
  let u: URL
  try { u = new URL(v) } catch { return { error: 'Địa chỉ không hợp lệ, dạng http://host:port', warnings: [] } }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'Chỉ nhận địa chỉ http:// hoặc https://', warnings: [] }
  if (u.username || u.password) return { error: 'Không đặt user:mật khẩu@ trong địa chỉ', warnings: [] }
  const warnings: string[] = []
  if (!isPrivateHost(u.hostname)) warnings.push('Địa chỉ nằm ngoài mạng LAN/localhost: dữ liệu sẽ đi ra ngoài. Chắc chắn đúng chưa?')
  if (u.pathname === '/') warnings.push('Nếu dùng chuẩn OpenAI, thường cần thêm /v1 ở cuối (vd http://máy:11434/v1).')
  return { warnings }
}

/** Số nguyên trong [min, max]; NaN (ô trống) là lỗi. */
export const intInRange = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max

/** Chỉ trả địa chỉ http/https hợp lệ (chặn javascript:, data:...) để dùng làm href cho đường dẫn do BE gửi về. */
export function safeHttpUrl(raw: string): string | null {
  try { const u = new URL(raw); return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null } catch { return null }
}
