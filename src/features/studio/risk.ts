import type { Decision, EffectivePermissions, RiskLevel } from '../../types/tools'
import type { DataClass, Health } from '../../types/models'
import type { Sensitivity } from '../../types/knowledge'

// Màu + chữ + biểu tượng đi cùng nhau (không bao giờ chỉ dựa vào màu). Mọi cặp màu đạt tương phản AA.
export const RISK_ORDER: RiskLevel[] = ['READ', 'WRITE_INTERNAL', 'EXTERNAL', 'MONEY', 'DESTRUCTIVE']
export const RISK_STYLE: Record<RiskLevel, { label: string; color: string; soft: string; hint: string }> = {
  READ: { label: 'Chỉ đọc', color: '#1d4ed8', soft: '#dbeafe', hint: 'Chỉ đọc dữ liệu, không thay đổi gì.' },
  WRITE_INTERNAL: { label: 'Ghi nội bộ', color: '#166534', soft: '#dcfce7', hint: 'Ghi dữ liệu bên trong công ty, có thể hoàn tác.' },
  EXTERNAL: { label: 'Gửi ra ngoài', color: '#c2410c', soft: '#ffedd5', hint: 'Gửi thông tin ra khỏi công ty (thư, bài đăng...).' },
  MONEY: { label: 'Chi tiền', color: '#b91c1c', soft: '#fee2e2', hint: 'Làm mất tiền, không hoàn lại được.' },
  DESTRUCTIVE: { label: 'Phá huỷ dữ liệu', color: '#7f1d1d', soft: '#fecaca', hint: 'Xoá hoặc làm mất dữ liệu, không khôi phục được.' },
}
export const riskRank = (r: RiskLevel) => RISK_ORDER.indexOf(r)
/** MONEY / DESTRUCTIVE: đổi quyền cần xác nhận hai bước, công cụ bị khoá mờ nếu chưa bật cờ quản trị */
export const isHighRisk = (r: RiskLevel) => riskRank(r) >= riskRank('MONEY')

/** "Tam giác rủi ro": dữ liệu riêng + đọc nội dung ngoài + gửi ra ngoài. BE tự buộc duyệt, FE chỉ cảnh báo. */
export const hasRiskTriangle = (p: Pick<EffectivePermissions, 'privateData' | 'readsExternal' | 'sendsOut'>) => p.privateData && p.readsExternal && p.sendsOut
export const TRIANGLE_TEXT = 'Agent vừa có dữ liệu riêng, vừa đọc nội dung từ bên ngoài, vừa có công cụ gửi ra ngoài. Mọi hành động ra ngoài sau khi đọc nội dung ngoài sẽ buộc phải chờ bạn duyệt (bảo vệ ở backend, không tắt được).'

export const SENSITIVITY_STYLE: Record<Sensitivity, { label: string; color: string; soft: string }> = {
  PUBLIC: { label: 'Công khai', color: '#334155', soft: '#e2e8f0' },
  INTERNAL: { label: 'Nội bộ', color: '#1d4ed8', soft: '#dbeafe' },
  CONFIDENTIAL: { label: 'Mật', color: '#6b21a8', soft: '#f3e8ff' },
}
export const DATACLASS_STYLE: Record<DataClass, { label: string; hint: string; color: string; soft: string }> = {
  LOCAL: { label: 'LOCAL', hint: 'Chạy trên máy của công ty, dữ liệu không rời khỏi mạng nội bộ.', color: '#166534', soft: '#dcfce7' },
  CLOUD: { label: 'CLOUD', hint: 'Chạy trên dịch vụ bên ngoài, dữ liệu được gửi đi.', color: '#075985', soft: '#e0f2fe' },
}
export const HEALTH_STYLE: Record<Health['status'], { label: string; color: string }> = {
  UP: { label: 'Hoạt động', color: '#166534' },
  DEGRADED: { label: 'Chập chờn', color: '#854d0e' },
  DOWN: { label: 'Ngừng', color: '#b91c1c' },
}

export const DECISION_STYLE: Record<Decision, { label: string; color: string; soft: string }> = {
  ALLOWED: { label: 'Cho phép', color: '#166534', soft: '#dcfce7' },
  DENIED: { label: 'Bị từ chối', color: '#b91c1c', soft: '#fee2e2' },
  NEEDS_APPROVAL: { label: 'Cần duyệt', color: '#92400e', soft: '#fef3c7' },
}
