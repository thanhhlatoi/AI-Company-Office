import type { RiskType } from '../../types'

/** Màu + nhãn theo loại rủi ro. MONEY và DESTRUCTIVE cần xác nhận lần hai khi duyệt. */
export const RISK: Record<RiskType, { label: string; color: string; soft: string; hint: string; confirm: boolean }> = {
  EXTERNAL: { label: 'Gửi ra ngoài', color: '#c2410c', soft: '#ffedd5', hint: 'Hành động này gửi thông tin ra khỏi công ty.', confirm: false },
  MONEY: { label: 'Chi tiền', color: '#b91c1c', soft: '#fee2e2', hint: 'Hành động này làm mất tiền và không hoàn lại được.', confirm: true },
  DESTRUCTIVE: { label: 'Phá huỷ dữ liệu', color: '#7f1d1d', soft: '#fecaca', hint: 'Hành động này xoá hoặc làm mất dữ liệu, không khôi phục được.', confirm: true },
}

/** Từ phải gõ lại ở bước xác nhận thứ hai. */
export const CONFIRM_WORD = 'DUYỆT'
/** So khớp không phân biệt hoa/thường và dấu ("duyet" cũng được). */
export const isConfirmWord = (s: string) => s.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() === 'duyet'
