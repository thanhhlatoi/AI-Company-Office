// Kiểm tra tệp ở trình duyệt TRƯỚC khi tải lên (BE vẫn là nguồn quyết định). Không import gì: chạy được bằng `node --test`.
export const ALLOWED_EXT = ['pdf', 'docx', 'md', 'txt', 'csv', 'html', 'eml'] as const
export const MAX_BYTES = 50 * 1024 * 1024

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '')
export function checkFile(name: string, size: number): string | null {
  const ext = extOf(name)
  if (!ALLOWED_EXT.includes(ext as (typeof ALLOWED_EXT)[number])) return `Định dạng .${ext || '?'} chưa được hỗ trợ (cho phép: ${ALLOWED_EXT.join(', ')})`
  if (size === 0) return 'Tệp rỗng'
  if (size > MAX_BYTES) return `Tệp lớn hơn ${MAX_BYTES / 1024 / 1024} MB`
  return null
}
export const fmtSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
