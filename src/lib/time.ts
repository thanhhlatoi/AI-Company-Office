const TZ = 'Asia/Ho_Chi_Minh'
const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'always' })

/** "2 phút trước". Chênh lệch tuyệt đối nên không phụ thuộc múi giờ. */
export function timeAgo(iso: string, now = Date.now()): string {
  const sec = Math.round((new Date(iso).getTime() - now) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, size] of units) {
    if (Math.abs(sec) >= size) return rtf.format(Math.trunc(sec / size), unit)
  }
  return rtf.format(sec, 'second')
}

/** Giờ đầy đủ theo múi giờ Việt Nam (dùng cho tooltip / nhật ký). */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: TZ })
}

/** Khoảng thời gian dạng "2 giờ 5 phút" (hai đơn vị lớn nhất). */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  if (d) return `${d} ngày ${h} giờ`
  if (h) return `${h} giờ ${m} phút`
  if (m) return `${m} phút ${s % 60} giây`
  return `${s} giây`
}

/** Ngày dạng yyyy-mm-dd theo Asia/Ho_Chi_Minh (khoá nhóm theo ngày cho biểu đồ). */
export const dayKey = (iso: string | number) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: TZ })

/** "25/11/2026" theo Asia/Ho_Chi_Minh. */
export const formatDay = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { timeZone: TZ })
