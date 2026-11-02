import { formatUsd } from '../../lib/money.ts'

/** Trạng thái hình của tủ rack theo số liệu thiết bị; không có thiết bị thì nhịp nhẹ mặc định. */
export function rackState(device: { status: string; metrics: { cpuPct?: number | null } } | undefined, cpuAlert = 90): 'default' | 'busy' | 'alert' | 'off' {
  if (!device) return 'default'
  if (device.status === 'OFFLINE') return 'off'
  const cpu = device.metrics.cpuPct ?? 0
  return cpu >= cpuAlert ? 'alert' : cpu >= 50 ? 'busy' : 'default'
}

/** Số dư ngân sách còn lại của CẢ CÔNG TY (hạn mức - đã dùng - đang giữ); không có ngân sách công ty thì null (không bịa số). */
export function companyBalanceMicro(budgets: { scopeType: string; limitMicro: number; usedMicro: number; reservedMicro: number }[] | undefined): number | null {
  const b = budgets?.find((x) => x.scopeType === 'COMPANY')
  return b ? b.limitMicro - b.usedMicro - b.reservedMicro : null
}
export const safeText = (micro: number | null) => (micro === null ? '' : formatUsd(micro))

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
/** Bảng mục tiêu: tiêu đề cắt ngắn + % tiến độ của mục tiêu đang chạy. */
export const goalBoardText = (goal: { title: string; pct: number } | null) => (goal ? `${cut(goal.title, 17)}\n${goal.pct}%` : 'Không có\nmục tiêu')
