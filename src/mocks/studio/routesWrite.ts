import { ApiError } from '../../api/http'
import { renderTemplate } from '../../features/studio/template'
import type { ModelPolicyInput } from '../../types/models'
import { mockDb } from '../db'
import { versionsOf, studioOf } from './logsData'
import { modelView, models, policies, policyOf, resolvePolicy } from './modelsData'
import { templates } from './templatesData'
import { iso } from './toolsData'

const bad = (status: number, msg: string): never => { throw new ApiError(status, `Mock ${status}: ${msg}`, { message: msg }) }
const agentOf = (id: string) => mockDb.agents.find((a) => a.id === id) ?? bad(404, `không có agent ${id}`)

/** Đặt prompt mới cho agent = thêm một phiên bản (không bao giờ ghi đè phiên bản cũ). */
function newVersion(agentId: string, prompt: string, note: string) {
  if (prompt.trim().length < 10) bad(400, 'System prompt tối thiểu 10 ký tự')
  const a = agentOf(agentId), list = versionsOf(agentId)
  const v = { id: `${agentId}-v${list[0].version + 1}`, agentId, version: list[0].version + 1, prompt, note, author: 'Chủ', createdAt: iso(Date.now()) }
  list.unshift(v)
  a.systemPrompt = prompt
  return v
}

/** Một lần gọi thử model (dùng cho "Thử model" và "So sánh"): tốn token thật với CLOUD. */
export function testModel(modelId: string, prompt: string) {
  const prof = models.find((x) => x.id === modelId) ?? bad(404, `không có model ${modelId}`)
  const inT = Math.ceil(prompt.length / 3.5), outT = 60 + (prompt.length % 40)
  const base = { modelId: prof.id, inputTokens: inT, latencyMs: { FAST: 380, BALANCED: 900, POWER: 1700 }[prof.tier] + (prompt.length % 120) }
  if (modelView(prof).health.status === 'DOWN') return { ...base, output: '', outputTokens: 0, costMicro: 0, error: 'Model đang ngừng hoạt động (hoặc máy chạy nó đang OFFLINE)' }
  return { ...base, outputTokens: outT, costMicro: Math.round((inT * prof.inputPerMTokMicro + outT * prof.outputPerMTokMicro) / 1_000_000), output: `**${prof.label}** trả lời thử:\n\n> ${prompt.slice(0, 120) || '(trống)'}\n\nĐây là câu trả lời giả của mock.`, error: null }
}

/** Mock các lệnh GHI của Agent Studio (Bước 2). undefined = không phải route này. */
export function studioWrite(method: string, path: string, body: unknown): unknown {
  const b = (body ?? {}) as Record<string, unknown>
  let m: RegExpMatchArray | null
  if (method === 'POST' && (m = path.match(/^\/agents\/([^/]+)\/prompt-versions$/))) return newVersion(m[1], String(b.prompt ?? ''), String(b.note ?? ''))
  if (method === 'POST' && (m = path.match(/^\/agents\/([^/]+)\/prompt-versions\/([^/]+)\/restore$/))) {
    const old = versionsOf(m[1]).find((v) => v.id === m![2]) ?? bad(404, `không có phiên bản ${m[2]}`)
    return newVersion(m[1], old.prompt, `Khôi phục từ v${old.version}`)
  }
  if (method === 'PUT' && (m = path.match(/^\/agents\/([^/]+)\/model-policy$/))) {
    const p = b as unknown as ModelPolicyInput, a = agentOf(m[1])
    if (!models.some((x) => x.id === p.primaryId)) bad(400, 'Model chính không tồn tại')
    if (p.fallbackIds.includes(p.primaryId)) bad(400, 'Model dự phòng không được trùng model chính')
    policies.set(a.id, { agentId: a.id, primaryId: p.primaryId, fallbackIds: p.fallbackIds, escalationId: p.escalationId ?? null, routing: p.routing, privacy: p.privacy })
    a.model = p.primaryId
    return resolvePolicy(policyOf(a.id))
  }
  if (method === 'POST' && (m = path.match(/^\/models\/([^/]+)\/test$/))) return testModel(m[1], String(b.prompt ?? ''))
  if (method === 'POST' && (m = path.match(/^\/agents\/([^/]+)\/template-sync$/))) {
    const a = agentOf(m[1]), cfg = studioOf(a.id), parts = (b.parts ?? []) as string[]
    const t = templates.find((x) => x.id === cfg.templateId) ?? bad(400, 'Agent không tạo từ mẫu')
    if (parts.includes('prompt')) newVersion(a.id, renderTemplate(t), `Áp dụng mẫu ${t.name} v${t.version}`)
    if (parts.includes('model') && t.modelRequirement.preferLocal) {
      const local = models.find((x) => x.dataClass === 'LOCAL' && modelView(x).health.status !== 'DOWN')
      if (local) policies.set(a.id, { ...policyOf(a.id), primaryId: local.id })
    }
    cfg.templateVersion = t.version; cfg.latestTemplateVersion = t.version
    return cfg
  }
  if (method === 'POST' && (m = path.match(/^\/departments\/([^/]+)\/head$/))) {
    const dept = mockDb.departments.find((d) => d.id === m![1]) ?? bad(404, `không có phòng ${m[1]}`)
    const target = agentOf(String(b.agentId))
    if (target.departmentId !== dept.id) bad(400, 'Agent không thuộc phòng này')
    for (const x of mockDb.agents) if (x.departmentId === dept.id) x.isHead = x.id === target.id
    dept.headAgentId = target.id
    return { ok: true }
  }
  return undefined
}
