import { missingVariables, renderTemplate } from '../../features/studio/template'
import type { AgentTemplate, AgentTemplateInput, InstantiateInput } from '../../types/studio'
import { budgetRequest } from '../biz/budgets'
import { mockDb, newId } from '../db'
import { publishEvent } from '../work'
import { collections } from './knowledgeData'
import { studioConfigs } from './logsData'
import { namespaces } from './memoryData'
import { policies } from './modelsData'
import { checkScope, fail } from './routesTools'
import { templates } from './templatesData'
import { audit, grants, iso, nextGrantId, tools } from './toolsData'

let seq = 800
const COLORS = ['#4f46e5', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899', '#7c3aed']
const tplOf = (id: string) => templates.find((t) => t.id === id) ?? fail(404, `không có mẫu ${id}`)
const make = (i: AgentTemplateInput, kind: AgentTemplate['kind']): AgentTemplate => {
  const t: AgentTemplate = { id: `tpl${++seq}`, kind, version: 1, locked: false, createdAt: iso(Date.now()), name: i.name, group: kind === 'IMPORTED' ? 'Đã nhập' : i.group, description: i.description, systemPrompt: i.systemPrompt, promptNotes: i.promptNotes, variables: i.variables, suggestedTools: i.suggestedTools.map((s) => ({ toolId: s.toolId, scope: s.scope })), modelRequirement: { ...i.modelRequirement, minTier: i.modelRequirement.minTier ?? null } }
  templates.push(t); return t
}
/** Gỡ khỏi phạm vi mọi thứ riêng của agent: bí mật (x-secretKind), id tài khoản, đường dẫn, mã bảng tính, tên miền cụ thể */
function scrub(toolId: string, scope: Record<string, unknown>) {
  const props = (tools.find((t) => t.id === toolId)?.scopeSchema.properties ?? {}) as Record<string, Record<string, unknown>>
  return Object.fromEntries(Object.entries(scope).filter(([k, v]) => !props[k]?.['x-secretKind'] && !/path|sheet|account|channel|host|domain|payee/i.test(k) && (typeof v === 'number' || typeof v === 'boolean')))
}

/** Mock mẫu agent: lưu / nhập / nhân bản / xoá / tạo agent (Bước 7). undefined = không phải route này. */
export function templatesRoute(method: string, path: string, body: unknown): unknown {
  const b = (body ?? {}) as Record<string, unknown>
  let m: RegExpMatchArray | null
  if (method === 'POST' && path === '/templates/import') return make(b as unknown as AgentTemplateInput, 'IMPORTED')
  if (method === 'POST' && path === '/templates') return make(b as unknown as AgentTemplateInput, 'MINE')
  if (method === 'POST' && (m = path.match(/^\/templates\/([^/]+)\/clone$/))) { const t = tplOf(m[1]); return make({ ...t, name: `${t.name} (bản của tôi)`, group: 'Mẫu của tôi', modelRequirement: t.modelRequirement }, 'MINE') }
  if (method === 'DELETE' && (m = path.match(/^\/templates\/([^/]+)$/))) {
    const t = tplOf(m[1]); if (t.locked) fail(403, 'Mẫu dựng sẵn bị khoá, hãy nhân bản để sửa')
    templates.splice(templates.indexOf(t), 1); return null
  }
  if (method === 'POST' && (m = path.match(/^\/agents\/([^/]+)\/save-as-template$/))) {
    const a = mockDb.agents.find((x) => x.id === m![1]) ?? fail(404, `không có agent ${m[1]}`)
    const t = make({ ...(b as unknown as AgentTemplateInput), suggestedTools: [] }, 'MINE')
    t.suggestedTools = grants.filter((g) => g.agentId === a.id).map((g) => ({ toolId: g.toolId, scope: scrub(g.toolId, g.scope) })) // BE tự gỡ phần riêng của agent
    return t
  }
  if (method === 'POST' && (m = path.match(/^\/templates\/([^/]+)\/instantiate$/))) {
    const t = tplOf(m[1]), i = b as unknown as InstantiateInput
    if (!i.name?.trim() || !i.role?.trim()) fail(400, 'Cần tên và vai trò')
    const missing = missingVariables(t, i.variables ?? {}); if (missing.length) fail(400, `Thiếu biến bắt buộc: ${missing.map((v) => v.label).join(', ')}`)
    for (const g of i.grants) {
      const tool = tools.find((x) => x.id === g.toolId) ?? fail(404, `không có công cụ ${g.toolId}`)
      if (!tool.enabled) fail(403, `Công cụ "${tool.name}" đang bị tắt khẩn cấp`, { reasonCode: 'TOOL_DISABLED' })
      if (tool.requiresAdminFlag && !tool.adminFlagOn) fail(403, `Công cụ "${tool.name}" cần bật cờ xác nhận ở trang quản trị`, { reasonCode: 'ADMIN_FLAG_OFF' })
      checkScope(tool.scopeSchema, g.scope)
    }
    const a = { id: newId(), name: i.name.trim(), role: i.role.trim(), model: i.model.primaryId, systemPrompt: renderTemplate(t, i.variables), color: COLORS[mockDb.agents.length % COLORS.length], status: 'IDLE' as const, currentTask: null, departmentId: i.departmentId ?? null, isHead: false, runsOnDeviceId: null }
    mockDb.agents.push(a)
    policies.set(a.id, { agentId: a.id, ...i.model })
    const now = iso(Date.now())
    for (const g of i.grants) {
      grants.push({ id: nextGrantId(), agentId: a.id, toolId: g.toolId, scope: g.scope, limits: { maxCallsPerTask: null, maxPerMinute: null, expiresAt: null, ...g.limits }, alwaysApprove: g.alwaysApprove, secretId: g.secretId ?? null, createdAt: now, updatedAt: now })
      audit.unshift({ id: `a${++seq}`, at: now, actor: 'Chủ', agentId: a.id, toolId: g.toolId, action: 'GRANT', before: null, after: { scope: g.scope, alwaysApprove: g.alwaysApprove }, reason: `Tạo từ mẫu ${t.name}` })
    }
    for (const c of i.collections) if (c.access !== 'NONE') (collections.find((x) => x.id === c.collectionId) ?? fail(400, `không có bộ sưu tập ${c.collectionId}`)).acl.push({ kind: 'AGENT', id: a.id, access: c.access })
    const ns = i.namespaces.filter((n) => n.access !== 'NONE')
    if (i.memoryPolicy.enabled && !ns.length) { const id = `ns-${a.id}`; namespaces.push({ id, name: `Bộ nhớ ${a.name}`, agentId: a.id, limit: 500, ttlDays: 180, requireReview: i.memoryPolicy.requireReview, itemCount: 0, pendingCount: 0 }); ns.push({ namespaceId: id, access: 'WRITE' }) }
    studioConfigs.set(a.id, { agentId: a.id, templateId: t.id, templateVersion: t.version, latestTemplateVersion: t.version, memoryPolicy: i.memoryPolicy, collections: [], namespaces: ns, dailyBudgetMicro: i.dailyBudgetMicro ?? null })
    if (i.dailyBudgetMicro && i.dailyBudgetMicro > 0) budgetRequest('POST', '/budgets', { scopeType: 'AGENT', scopeId: a.id, period: 'DAY', limitMicro: i.dailyBudgetMicro, warnPct: 80, mode: 'BLOCK' })
    publishEvent({ type: 'template.instantiated', templateId: t.id, agentId: a.id })
    return { agent: structuredClone(a) }
  }
  return undefined
}
