import type { SettingsAi } from '../../types/settingsAi'

/** Đường đi hiện tại của AI, nói bằng tiếng người. */
export function routeText(s: Pick<SettingsAi['llm'], 'provider' | 'viaOmniroute'>): string {
  if (s.provider === 'fake') return 'Không gọi AI thật: hệ thống đang trả lời mẫu (AI giả).'
  return s.viaOmniroute ? 'Agent gọi OmniRoute → Ollama ưu tiên (miễn phí); AI cloud chỉ là dự phòng nếu OmniRoute cấu hình như vậy.' : 'Agent gọi trực tiếp Ollama.'
}
