import type { HermesStatus } from '../../types/hermes.ts'

type HermesState = Pick<HermesStatus, 'reachable' | 'agentsInOffice' | 'botsInHermes' | 'missing' | 'orphans'>

export interface HermesBanner { tone: 'error' | 'warn'; text: string }

/** Banner đầu khung đồng bộ: null = khớp. Phát hiện cảnh "VPS vừa reset" (Hermes không còn bot nào). */
export function hermesBanner(s: HermesState): HermesBanner | null {
  if (!s.reachable) return { tone: 'error', text: 'Không kết nối được Hermes. Kiểm tra địa chỉ, token và VPS rồi thử lại.' }
  if (s.botsInHermes === 0 && s.agentsInOffice > 0) return { tone: 'warn', text: `Hermes chưa có bot nào (VPS vừa reset?). Bấm “Đồng bộ lại tất cả” để tạo lại bot cho ${s.agentsInOffice} agent.` }
  if (s.missing > 0 || s.orphans > 0) {
    const parts = [s.missing > 0 && `${s.missing} agent thiếu bot`, s.orphans > 0 && `${s.orphans} bot thừa trong Hermes`].filter(Boolean)
    return { tone: 'warn', text: `Hermes lệch với AgentOffice: ${parts.join(', ')}.` }
  }
  return null
}

export const SYNC_LABEL = {
  SYNCED: 'Đã đồng bộ',
  NOT_SYNCED: 'Chưa tạo bot',
  MISSING: 'Bot đã mất ở Hermes',
  ERROR: 'Lỗi đồng bộ',
} as const
