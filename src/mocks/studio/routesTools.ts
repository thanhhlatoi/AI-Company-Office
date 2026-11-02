import { ApiError } from '../../api/http'
import type { PermissionChange } from '../../types/tools'
import { publishEvent } from '../work'
import { effectiveOf } from './permissions'
import { audit, grants, iso, nextGrantId, secrets, tools } from './toolsData'
import { mockDb } from '../db'

export const fail = (status: number, message: string, extra: object = {}): never => { throw new ApiError(status, `Mock ${status}: ${message}`, { message, ...extra }) }
let auditSeq = 100
const log = (a: Omit<(typeof audit)[number], 'id' | 'at' | 'actor'>) => audit.unshift({ id: `a${++auditSeq}`, at: iso(Date.now()), actor: 'Chủ', ...a })
const changed = (agentId: string, toolId?: string) => publishEvent({ type: 'grant.changed', agentId, toolId })

/** Kiểm tra phạm vi theo JSON Schema (tập con: required, kiểu, min/max); BE thật tự kiểm đầy đủ. */
export function checkScope(schema: Record<string, unknown>, scope: Record<string, unknown>) {
  const props = (schema.properties ?? {}) as Record<string, { type?: string; minimum?: number; maximum?: number; title?: string }>
  for (const k of (schema.required ?? []) as string[]) {
    const v = scope[k]
    if (v === undefined || v === '' || v === null || (Array.isArray(v) && !v.length)) fail(400, `Thiếu "${props[k]?.title ?? k}"`)
  }
  for (const [k, p] of Object.entries(props)) {
    const v = scope[k]
    if (typeof v === 'number' && ((p.minimum != null && v < p.minimum) || (p.maximum != null && v > p.maximum))) fail(400, `"${p.title ?? k}" ngoài khoảng cho phép`)
  }
}

/** Mock lệnh GHI công cụ / quyền / bí mật (Bước 3). undefined = không phải route này. */
export function toolsWrite(method: string, path: string, body: unknown): unknown {
  const b = (body ?? {}) as Record<string, unknown>
  let m: RegExpMatchArray | null
  if (method === 'PUT' && (m = path.match(/^\/agents\/([^/]+)\/grants$/))) {
    const agentId = m[1], c = b as unknown as PermissionChange
    if (!mockDb.agents.some((a) => a.id === agentId)) fail(404, `không có agent ${agentId}`)
    for (const gi of c.grants) {
      const t = tools.find((x) => x.id === gi.toolId) ?? fail(404, `không có công cụ ${gi.toolId}`)
      if (!t.enabled) fail(403, `Công cụ "${t.name}" đang bị tắt khẩn cấp`, { reasonCode: 'TOOL_DISABLED' })
      if (t.requiresAdminFlag && !t.adminFlagOn) fail(403, `Công cụ "${t.name}" cần bật cờ xác nhận ở trang quản trị`, { reasonCode: 'ADMIN_FLAG_OFF' })
      checkScope(t.scopeSchema, gi.scope)
    }
    for (const gi of c.grants) {
      const i = grants.findIndex((g) => g.agentId === agentId && g.toolId === gi.toolId), now = iso(Date.now())
      const next = { id: i >= 0 ? grants[i].id : nextGrantId(), agentId, toolId: gi.toolId, scope: gi.scope, limits: { maxCallsPerTask: null, maxPerMinute: null, expiresAt: null, ...gi.limits }, alwaysApprove: gi.alwaysApprove, secretId: gi.secretId ?? null, createdAt: i >= 0 ? grants[i].createdAt : now, updatedAt: now }
      log({ agentId, toolId: gi.toolId, action: i >= 0 ? 'UPDATE' : 'GRANT', before: i >= 0 ? { scope: grants[i].scope, alwaysApprove: grants[i].alwaysApprove } : null, after: { scope: gi.scope, alwaysApprove: gi.alwaysApprove }, reason: c.reason ?? null })
      if (i >= 0) grants[i] = next; else grants.push(next)
    }
    for (const toolId of c.remove) {
      const i = grants.findIndex((g) => g.agentId === agentId && g.toolId === toolId)
      if (i < 0) continue
      log({ agentId, toolId, action: 'REVOKE', before: { scope: grants[i].scope }, after: null, reason: c.reason ?? null })
      grants.splice(i, 1)
    }
    changed(agentId)
    return effectiveOf(agentId)
  }
  if (method === 'PUT' && (m = path.match(/^\/tools\/([^/]+)$/))) {
    const t = tools.find((x) => x.id === m![1]) ?? fail(404, `không có công cụ ${m[1]}`)
    if (typeof b.enabled === 'boolean' && b.enabled !== t.enabled) { log({ toolId: t.id, action: 'KILL_SWITCH', before: { enabled: t.enabled }, after: { enabled: b.enabled }, reason: String(b.reason ?? '') || null }); t.enabled = b.enabled }
    if (typeof b.adminFlagOn === 'boolean' && b.adminFlagOn !== t.adminFlagOn) {
      if (!t.requiresAdminFlag) fail(400, 'Công cụ này không dùng cờ quản trị')
      log({ toolId: t.id, action: 'ADMIN_FLAG', before: { adminFlagOn: t.adminFlagOn }, after: { adminFlagOn: b.adminFlagOn }, reason: String(b.reason ?? '') || null }); t.adminFlagOn = b.adminFlagOn
    }
    changed('*', t.id) // đổi toàn cục: mọi agent dùng công cụ này bị ảnh hưởng ngay
    return { ...t, agentCount: grants.filter((g) => g.toolId === t.id).length }
  }
  if (method === 'POST' && path === '/secrets') {
    const name = String(b.name ?? '').trim()
    if (!name || !String(b.value ?? '')) fail(400, 'Cần tên và giá trị')
    if (secrets.some((s) => s.name === name)) fail(409, 'Đã có bí mật cùng tên')
    const s = { id: `s${secrets.length + 10}`, name, kind: String(b.kind ?? 'other'), createdAt: iso(Date.now()), rotatedAt: null, lastUsedAt: null, usedBy: [] } // KHÔNG lưu giá trị
    secrets.push(s)
    return s
  }
  if ((m = path.match(/^\/secrets\/([^/]+)(\/rotate)?$/))) {
    const s = secrets.find((x) => x.id === m![1]) ?? fail(404, `không có bí mật ${m[1]}`)
    if (method === 'POST' && m[2]) { if (!String(b.value ?? '')) fail(400, 'Cần giá trị mới'); s.rotatedAt = iso(Date.now()); return s }
    if (method === 'DELETE') {
      const usedBy = grants.filter((g) => g.scope.account === s.id || g.scope.channel === s.id).map((g) => ({ agentId: g.agentId, toolId: g.toolId }))
      if (usedBy.length) fail(409, 'Bí mật đang được quyền tham chiếu', { reasonCode: 'IN_USE', usedBy })
      secrets.splice(secrets.indexOf(s), 1)
      return null
    }
  }
  return undefined
}
