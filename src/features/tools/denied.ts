// Gom các lời gọi công cụ bị chặn để phát hiện agent thiếu quyền hoặc đang bị lừa. Không import runtime: chạy được bằng `node --test`.
export interface DeniedCall { id: string; at: string; agentId: string; toolId: string; reason: string; taskId?: string | null; args: Record<string, unknown> }
export interface DeniedGroup { key: string; agentId: string; toolId: string; reason: string; count: number; lastAt: string; targets: string[]; taskIds: string[]; suspicious: boolean }

/** Đích của lời gọi (để thấy "nhiều lần bị chặn tới đích lạ"): miền của thư, host của URL, bên nhận hay đường dẫn */
export function targetOf(args: Record<string, unknown>): string | null {
  if (typeof args.to === 'string') return args.to.split('@')[1] ?? args.to
  if (typeof args.url === 'string') { try { return new URL(args.url).host } catch { return args.url } }
  if (typeof args.payee === 'string') return args.payee
  if (typeof args.path === 'string') return args.path
  return null
}

/** Nghi bị lừa: bị chặn từ 3 lần trở lên và có từ 2 đích khác nhau (agent liên tục thử những nơi lạ). */
export const SUSPICIOUS_MIN_COUNT = 3

export function groupDenied(calls: DeniedCall[]): DeniedGroup[] {
  const map = new Map<string, DeniedGroup>()
  for (const c of calls) {
    const key = `${c.agentId}|${c.toolId}|${c.reason.replace(/"[^"]*"/g, '"…"')}`
    const g = map.get(key) ?? { key, agentId: c.agentId, toolId: c.toolId, reason: c.reason.replace(/"[^"]*"/g, '"…"'), count: 0, lastAt: c.at, targets: [], taskIds: [], suspicious: false }
    g.count++
    if (c.at > g.lastAt) g.lastAt = c.at
    const t = targetOf(c.args)
    if (t && !g.targets.includes(t)) g.targets.push(t)
    if (c.taskId && !g.taskIds.includes(c.taskId)) g.taskIds.push(c.taskId)
    map.set(key, g)
  }
  const out = [...map.values()]
  for (const g of out) g.suspicious = g.count >= SUSPICIOUS_MIN_COUNT && g.targets.length >= 2
  return out.sort((a, b) => Number(b.suspicious) - Number(a.suspicious) || b.count - a.count || (a.lastAt < b.lastAt ? 1 : -1))
}
