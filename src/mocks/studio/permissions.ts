import { mockDb } from '../db'
import type { CheckResult, EffectivePermissions, Grant, Tool } from '../../types/tools'
import { riskRank } from '../../features/studio/risk'
import { grants, secrets, tools } from './toolsData'

// Hành vi BE giả cho quyền hiệu lực + "Thử quyền" (xem docs/BE_API_SPEC_PART3.md). Không thực thi gì.
const toolOf = (id: string) => tools.find((t) => t.id === id)

/** Vì sao một quyền đã cấp vẫn không dùng được (null = dùng được) */
export function blockedReason(t: Tool, g: Grant, now = Date.now()): string | null {
  if (!t.enabled) return 'Công cụ đang bị tắt khẩn cấp'
  if (t.requiresAdminFlag && !t.adminFlagOn) return 'Chưa bật cờ xác nhận ở trang quản trị'
  if (g.limits.expiresAt && Date.parse(g.limits.expiresAt) < now) return 'Quyền đã hết hạn'
  return null
}

/** Tóm tắt phạm vi bằng tên trường (title của schema) và tên bí mật, không để lộ id nội bộ */
const summarize = (t: Tool, scope: Record<string, unknown>) => {
  const props = (t.scopeSchema.properties ?? {}) as Record<string, { title?: string }>
  return Object.entries(scope).filter(([k, v]) => !(Array.isArray(v) && !v.length) && v !== null && v !== '' && !k.endsWith('Limit')).slice(0, 3)
    .map(([k, v]) => `${props[k]?.title ?? k}: ${Array.isArray(v) ? v.join(', ') : secrets.find((s) => s.id === v)?.name ?? String(v)}`).join(' · ')
}

export function effectiveOf(agentId: string, list: Grant[] = grants): EffectivePermissions {
  const mine = list.filter((g) => g.agentId === agentId)
  const live = mine.flatMap((g) => { const t = toolOf(g.toolId); return t ? [{ g, t, blocked: blockedReason(t, g) }] : [] })
  const on = live.filter((x) => !x.blocked)
  const any = (f: (t: Tool) => boolean) => on.some((x) => f(x.t))
  return {
    agentId,
    tools: live.map(({ g, t, blocked }) => ({
      toolId: t.id, allowed: !blocked, risk: t.risk, needsApproval: g.alwaysApprove || riskRank(t.risk) >= riskRank('MONEY'),
      scopeSummary: summarize(t, g.scope), expiresAt: g.limits.expiresAt ?? null, blockedReason: blocked,
    })),
    privateData: any((t) => t.readsPrivate), readsExternal: any((t) => t.readsExternal), sendsOut: any((t) => t.sendsOut),
  }
}
export const effectiveAll = () => mockDb.agents.map((a) => effectiveOf(a.id))

const hostOf = (s: string) => { try { return new URL(s).host } catch { return s } }
const asList = (v: unknown) => (Array.isArray(v) ? v.map(String) : [])

/** Kiểm tra phạm vi theo công cụ (đủ cho các công cụ mock; BE thật tự kiểm). Trả lý do từ chối hoặc null. */
function scopeViolation(toolId: string, scope: Record<string, unknown>, args: Record<string, unknown>): string | null {
  if (toolId === 'email_send') {
    const to = String(args.to ?? ''), domain = to.split('@')[1] ?? ''
    const allowed = asList(scope.allowedDomains)
    if (!domain) return 'Thiếu địa chỉ người nhận (to)'
    if (!allowed.includes(domain)) return allowed.length ? `Miền nhận "${domain}" không nằm trong danh sách cho phép (${allowed.join(', ')})` : 'Chưa khai báo miền nhận nào được phép'
  }
  if (toolId === 'web_fetch') {
    const host = hostOf(String(args.url ?? ''))
    if (!asList(scope.allowedHosts).some((h) => host === h || host.endsWith(`.${h}`))) return `Tên miền "${host}" không nằm trong danh sách cho phép`
  }
  if (toolId === 'file_read' || toolId === 'file_write' || toolId === 'file_delete') {
    const path = String(args.path ?? '')
    if (!asList(scope.paths).some((p) => path === p || path.startsWith(`${p}/`))) return `Đường dẫn "${path}" nằm ngoài thư mục được phép`
  }
  if (toolId === 'payment_transfer') {
    if (Number(args.amountUsd ?? 0) > Number(scope.maxAmountUsd ?? 0)) return `Vượt hạn mức mỗi lần (${scope.maxAmountUsd} USD)`
    if (!asList(scope.payees).includes(String(args.payee ?? ''))) return `Bên nhận "${args.payee}" không nằm trong danh sách cho phép`
  }
  return null
}

export function checkCall(toolId: string, agentId: string, args: Record<string, unknown>): CheckResult {
  const t = toolOf(toolId)
  if (!t) return { decision: 'DENIED', reason: 'Không có công cụ này' }
  const g = grants.find((x) => x.agentId === agentId && x.toolId === toolId)
  if (!g) return { decision: 'DENIED', reason: 'Agent chưa được cấp công cụ này' }
  const blocked = blockedReason(t, g)
  if (blocked) return { decision: 'DENIED', reason: blocked }
  const bad = scopeViolation(toolId, g.scope, args)
  if (bad) return { decision: 'DENIED', reason: bad }
  if (g.alwaysApprove) return { decision: 'NEEDS_APPROVAL', reason: 'Quyền này được đặt "luôn yêu cầu duyệt"' }
  if (riskRank(t.risk) >= riskRank('MONEY')) return { decision: 'NEEDS_APPROVAL', reason: 'Công cụ rủi ro cao luôn chờ duyệt' }
  const e = effectiveOf(agentId)
  if (t.sendsOut && e.privateData && e.readsExternal) return { decision: 'NEEDS_APPROVAL', reason: 'Tam giác rủi ro: gửi ra ngoài sau khi đọc nội dung ngoài phải chờ duyệt' }
  return { decision: 'ALLOWED', reason: 'Nằm trong phạm vi được cấp' }
}
