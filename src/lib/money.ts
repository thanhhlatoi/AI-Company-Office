// MỘT chỗ duy nhất định dạng tiền. Tiền lưu dạng số nguyên micro-USD (1 USD = 1_000_000).
// Không import gì để chạy được bằng `node --test` (xem package.json "test").

export const MICRO = 1_000_000
/** Tỉ giá mặc định đ/USD; người dùng chỉnh trong Cài đặt (settingsStore.vndRate). */
export const DEFAULT_VND_RATE = 25_000

/** USD (số thực) -> micro-USD nguyên. */
export const usdToMicro = (usd: number) => Math.round(usd * MICRO)

/** Số chữ số thập phân theo độ lớn: càng nhỏ càng cần nhiều chữ số để không hiện "$0.00". */
function decimals(absUsd: number) {
  if (absUsd >= 100) return 2
  if (absUsd >= 1) return 3
  if (absUsd >= 0.01) return 4
  return 6
}

/** "$0.0123", "$12.346", "$1,234.50". 0 -> "$0". */
export function formatUsd(micro: number): string {
  if (!micro) return '$0'
  const usd = Math.abs(micro) / MICRO
  const text = usd.toLocaleString('en-US', { minimumFractionDigits: decimals(usd), maximumFractionDigits: decimals(usd) })
  return `${micro < 0 ? '-' : ''}$${text}`
}

/** "≈ 320 đ" theo tỉ giá; làm tròn tới đồng. */
export function formatVnd(micro: number, rate: number = DEFAULT_VND_RATE): string {
  const vnd = Math.round((micro / MICRO) * rate)
  return `≈ ${vnd.toLocaleString('vi-VN')} đ`
}

/** Chuỗi tiền để hiển thị: USD, kèm VND nếu bật (vndRate > 0). */
export function formatMoney(micro: number, vndRate = 0): string {
  return vndRate > 0 ? `${formatUsd(micro)} (${formatVnd(micro, vndRate)})` : formatUsd(micro)
}

/** % thay đổi so với kỳ trước; null khi kỳ trước = 0 (không chia được). */
export const changePct = (now: number, prev: number): number | null => (prev === 0 ? null : ((now - prev) / prev) * 100)
