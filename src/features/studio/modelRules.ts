import type { ModelPolicyInput, ModelProfile } from '../../types/models'

export interface PolicyWarning { level: 'warning' | 'error'; text: string }

/**
 * Cảnh báo khi người dùng chỉnh chính sách model (chỉ GỢI Ý; BE mới là bên giải model dùng được).
 * `deviceOffline(id)`: máy chạy model local đang OFFLINE.
 */
export function policyWarnings(p: ModelPolicyInput, models: ModelProfile[], hasTools: boolean, deviceOffline: (id: string) => boolean = () => false): PolicyWarning[] {
  const byId = new Map(models.map((m) => [m.id, m]))
  const chain = [...new Set([p.primaryId, ...p.fallbackIds, ...(p.escalationId ? [p.escalationId] : [])])].map((id) => byId.get(id)).filter((m): m is ModelProfile => !!m)
  const out: PolicyWarning[] = []
  const primary = byId.get(p.primaryId)
  if (hasTools && primary && !primary.capabilities.toolUse) out.push({ level: 'error', text: `Agent có công cụ nhưng "${primary.label}" không hỗ trợ dùng công cụ.` })
  if (hasTools) for (const m of chain.slice(1)) if (!m.capabilities.toolUse) out.push({ level: 'warning', text: `Model "${m.label}" (dự phòng / leo thang) không hỗ trợ công cụ: khi chuyển sang nó, agent sẽ không gọi được công cụ.` })
  if (p.privacy === 'LOCAL_ONLY') {
    const local = chain.filter((m) => m.dataClass === 'LOCAL')
    if (!local.length) out.push({ level: 'error', text: 'Chế độ "Chỉ local" nhưng chưa chọn model LOCAL nào: agent sẽ không có model hợp lệ.' })
    else if (local.every((m) => m.health.status === 'DOWN' || (m.deviceId && deviceOffline(m.deviceId)))) out.push({ level: 'error', text: 'Chế độ "Chỉ local" nhưng máy chạy model local đang OFFLINE hoặc model ngừng hoạt động: task sẽ chờ, không tự chuyển lên cloud.' })
    const cloud = chain.filter((m) => m.dataClass === 'CLOUD')
    if (cloud.length) out.push({ level: 'warning', text: `Các model CLOUD (${cloud.map((m) => m.label).join(', ')}) sẽ bị bỏ qua ở chế độ "Chỉ local".` })
  }
  if (p.privacy === 'TRUSTED' && !chain.some((m) => m.provider === 'anthropic' || m.dataClass === 'LOCAL')) out.push({ level: 'warning', text: 'Chế độ "Chỉ đáng tin": chưa có model nào của nhà cung cấp đáng tin.' })
  return out
}

export const PRIVACY_INFO = {
  ANY: { label: 'Bất kỳ', hint: 'Mọi model đều được dùng, kể cả CLOUD.' },
  TRUSTED: { label: 'Chỉ đáng tin', hint: 'Chỉ model của nhà cung cấp đáng tin hoặc chạy local.' },
  LOCAL_ONLY: { label: 'Chỉ local', hint: 'Task đụng dữ liệu CONFIDENTIAL sẽ chỉ chạy trên model local. Nếu máy local tắt, task chờ — không tự chuyển lên cloud.' },
} as const
export const ROUTING_INFO = {
  FIXED: { label: 'Cố định', hint: 'Luôn dùng model chính; lỗi thì thử lần lượt các model dự phòng.' },
  RULES: { label: 'Theo luật', hint: 'Chọn model theo luật định tuyến (ưu tiên, độ dài, độ nhạy...) ở trang Model.' },
  TIERED: { label: 'Thang bậc', hint: 'Bắt đầu từ model nhẹ; kết quả không đạt thì leo lên model mạnh hơn.' },
} as const
