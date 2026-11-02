import type { EffectivePermissions, GrantInput, PermissionChange, Tool } from '../../types/tools'
import { RISK_STYLE, isHighRisk } from './risk.ts'
import { defaultScope } from './schemaForm.ts'

/** Câu trả lời mặc định cho từng công cụ ở ô "Thử quyền" (đủ để thấy luật phạm vi hoạt động). */
export const SAMPLE_ARGS: Record<string, Record<string, unknown>> = {
  email_send: { to: 'khach@acme.com', subject: 'Báo giá' }, web_fetch: { url: 'https://example.com' }, file_read: { path: '/workspace/data.csv' },
  file_write: { path: '/workspace/out/a.md' }, file_delete: { path: '/storage/tmp/cu.mp4' }, payment_transfer: { payee: 'Công ty ABC', amountUsd: 20 },
  web_search: { query: 'xu hướng' }, kb_search: { query: 'hoàn tiền' }, email_read: { folder: 'INBOX' }, social_post: { title: 'Bài mới' },
}
export const sampleArgs = (toolId: string) => SAMPLE_ARGS[toolId] ?? {}

/** Quyền mới cho một công cụ: phạm vi mặc định thận trọng, giới hạn vừa phải, chưa bắt duyệt. */
export const newGrant = (t: Pick<Tool, 'id' | 'scopeSchema'>): GrantInput => ({ toolId: t.id, scope: defaultScope(t.scopeSchema), limits: { maxCallsPerTask: 20, maxPerMinute: null, expiresAt: null }, alwaysApprove: false, secretId: null })
export const changeOf = (grants: GrantInput[], remove: string[] = [], reason?: string): PermissionChange => ({ grants, remove, reason: reason || undefined })

/** "Sau thay đổi agent này sẽ có thể..." — so quyền hiệu lực trước/sau thành các dòng chữ. */
export function describeChange(before: EffectivePermissions, after: EffectivePermissions, tools: Pick<Tool, 'id' | 'name'>[]): string[] {
  const name = (id: string) => tools.find((t) => t.id === id)?.name ?? id
  const b = new Map(before.tools.map((t) => [t.toolId, t])), a = new Map(after.tools.map((t) => [t.toolId, t]))
  const out: string[] = []
  for (const [id, t] of a) {
    const o = b.get(id)
    if (!o) out.push(`+ Dùng được "${name(id)}" (${RISK_STYLE[t.risk].label})${t.scopeSummary ? `: ${t.scopeSummary}` : ''}${t.needsApproval ? ' — mỗi lần phải chờ duyệt' : ''}`)
    else if (o.scopeSummary !== t.scopeSummary || o.needsApproval !== t.needsApproval || o.expiresAt !== t.expiresAt) out.push(`~ Đổi "${name(id)}": ${o.scopeSummary || 'không phạm vi'} → ${t.scopeSummary || 'không phạm vi'}${o.needsApproval !== t.needsApproval ? (t.needsApproval ? ' (nay luôn chờ duyệt)' : ' (nay KHÔNG còn bắt duyệt)') : ''}`)
  }
  for (const id of b.keys()) if (!a.has(id)) out.push(`− Không còn dùng được "${name(id)}"`)
  if (!before.readsExternal && after.readsExternal) out.push('+ Bắt đầu đọc được nội dung từ bên ngoài')
  if (!before.sendsOut && after.sendsOut) out.push('+ Bắt đầu gửi được thông tin ra ngoài')
  if (!before.privateData && after.privateData) out.push('+ Bắt đầu đọc được dữ liệu riêng')
  return out.length ? out : ['Không có thay đổi về quyền.']
}
/** Thay đổi có đụng mức MONEY / DESTRUCTIVE không (cần xác nhận hai bước) */
export const touchesHighRisk = (toolIds: string[], tools: Pick<Tool, 'id' | 'risk'>[]) => toolIds.some((id) => { const t = tools.find((x) => x.id === id); return !!t && isHighRisk(t.risk) })
