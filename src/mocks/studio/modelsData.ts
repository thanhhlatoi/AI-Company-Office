import { mockDb } from '../db'
import { mockDevices } from '../devices'
import type { ModelPolicy, ModelProfile, RoutingRule } from '../../types/models'
import { agentIdOf, iso, NOW } from './toolsData'

// 6 hồ sơ model: 2 LOCAL (một cái DOWN), 4 CLOUD. Model local phụ thuộc máy trong phòng Hạ tầng.
const H = (status: 'UP' | 'DEGRADED' | 'DOWN', errs = 0, ago = 30_000) => ({ status, consecutiveErrors: errs, checkedAt: iso(NOW - ago) })
const cap = (toolUse: boolean, json: boolean, vision: boolean) => ({ toolUse, json, vision })
const cloud = (id: string, label: string, modelId: string, tier: ModelProfile['tier'], inM: number, outM: number, ctx: number, vision: boolean, max: number): ModelProfile => ({
  id, label, provider: 'anthropic', modelId, baseUrl: null, secretId: 's5', dataClass: 'CLOUD', tier, capabilities: cap(true, true, vision),
  contextTokens: ctx, maxConcurrent: max, inUse: 0, inputPerMTokMicro: inM, outputPerMTokMicro: outM, health: H('UP'), deviceId: null,
})
export const models: ModelProfile[] = [
  cloud('claude-fable-5-1', 'Fable 5.1', 'claude-fable-5-1', 'POWER', 0, 0, 1_000_000, true, 4),
  cloud('claude-opus-5-5', 'Opus 5.5', 'claude-opus-5-5', 'POWER', 15_000_000, 75_000_000, 500_000, true, 6),
  cloud('claude-sonnet-5-5', 'Sonnet 5.5', 'claude-sonnet-5-5', 'BALANCED', 3_000_000, 15_000_000, 500_000, true, 10),
  cloud('claude-haiku-5-5', 'Haiku 5.5', 'claude-haiku-5-5', 'FAST', 1_000_000, 5_000_000, 200_000, false, 20),
  { id: 'qwen3-32b-local', label: 'Qwen3 32B (máy AI)', provider: 'ollama', modelId: 'qwen3:32b', baseUrl: 'http://ai-pc.lan:11434', secretId: null, dataClass: 'LOCAL', tier: 'BALANCED',
    capabilities: cap(true, true, false), contextTokens: 32_000, maxConcurrent: 2, inUse: 1, inputPerMTokMicro: 0, outputPerMTokMicro: 0, health: H('UP'), deviceId: 'ai-pc' },
  { id: 'llama3-8b-local', label: 'Llama 3.1 8B (server)', provider: 'vllm', modelId: 'llama-3.1-8b', baseUrl: 'http://server.lan:8000', secretId: null, dataClass: 'LOCAL', tier: 'FAST',
    capabilities: cap(false, true, false), contextTokens: 8_000, maxConcurrent: 4, inUse: 0, inputPerMTokMicro: 0, outputPerMTokMicro: 0, health: H('DOWN', 6, 14 * 60_000), deviceId: 'server' },
]
const byId = (id: string) => models.find((m) => m.id === id)
const TRUSTED = new Set(['anthropic'])

/** Hồ sơ trả cho FE: máy chạy model đang OFFLINE thì coi như ngừng (health DOWN) */
export function modelView(m: ModelProfile): ModelProfile {
  const dev = m.deviceId ? mockDevices.find((d) => d.id === m.deviceId) : null
  return dev?.status === 'OFFLINE' ? { ...m, health: { ...m.health, status: 'DOWN' } } : m
}
export const modelList = () => models.map(modelView)

/** Chính sách model của mỗi agent (có thể sửa ở bước sau) */
export const policies = new Map<string, Omit<ModelPolicy, 'resolved'>>()
const defaultPolicy = (agentId: string): Omit<ModelPolicy, 'resolved'> => {
  const a = mockDb.agents.find((x) => x.id === agentId)
  const primary = byId(a?.model ?? '') ? (a as { model: string }).model : 'claude-sonnet-5-5'
  return { agentId, primaryId: primary, fallbackIds: primary === 'claude-haiku-5-5' ? [] : ['claude-haiku-5-5'], escalationId: primary === 'claude-opus-5-5' ? null : 'claude-opus-5-5', routing: 'FIXED', privacy: 'ANY' }
}
policies.set(agentIdOf('Biên tập Qwen'), { agentId: agentIdOf('Biên tập Qwen'), primaryId: 'qwen3-32b-local', fallbackIds: ['llama3-8b-local'], escalationId: null, routing: 'FIXED', privacy: 'LOCAL_ONLY' })
policies.set(agentIdOf('CSKH'), { agentId: agentIdOf('CSKH'), primaryId: 'claude-sonnet-5-5', fallbackIds: ['claude-haiku-5-5'], escalationId: 'claude-opus-5-5', routing: 'RULES', privacy: 'TRUSTED' })
policies.set(agentIdOf('Kế toán thuế'), { agentId: agentIdOf('Kế toán thuế'), primaryId: 'qwen3-32b-local', fallbackIds: ['llama3-8b-local'], escalationId: null, routing: 'FIXED', privacy: 'LOCAL_ONLY' })

export const policyOf = (agentId: string) => policies.get(agentId) ?? defaultPolicy(agentId)

/** Giải model đang dùng được: lần lượt chính -> dự phòng -> leo thang, qua ràng buộc riêng tư + sức khoẻ + máy chạy */
export function resolvePolicy(p: Omit<ModelPolicy, 'resolved'>): ModelPolicy {
  const why: string[] = []
  for (const id of [p.primaryId, ...p.fallbackIds, ...(p.escalationId ? [p.escalationId] : [])]) {
    const raw = byId(id)
    if (!raw) continue
    const m = modelView(raw)
    if (p.privacy === 'LOCAL_ONLY' && m.dataClass !== 'LOCAL') { why.push(`${m.label}: là CLOUD, chế độ "Chỉ local" không cho dùng`); continue }
    if (p.privacy === 'TRUSTED' && !TRUSTED.has(m.provider) && m.dataClass !== 'LOCAL') { why.push(`${m.label}: nhà cung cấp không nằm trong danh sách đáng tin`); continue }
    if (m.health.status === 'DOWN') { why.push(m.deviceId && mockDevices.find((d) => d.id === m.deviceId)?.status === 'OFFLINE' ? `${m.label}: máy chạy model đang OFFLINE` : `${m.label}: đang ngừng hoạt động`); continue }
    return { ...p, resolved: { modelId: id, blockedBy: null } }
  }
  return { ...p, resolved: { modelId: null, blockedBy: why.join(' · ') || 'Chưa chọn model nào' } }
}

export const rules: RoutingRule[] = [
  { id: 'r1', order: 1, name: 'Việc gấp, ngắn', when: { priority: 'HIGH', maxTokens: 4000 }, modelId: 'claude-haiku-5-5' },
  { id: 'r2', order: 2, name: 'Dữ liệu mật chạy local', when: { dataClass: 'CONFIDENTIAL' }, modelId: 'qwen3-32b-local' },
  { id: 'r3', order: 3, name: 'Việc dài', when: { minTokens: 20000 }, modelId: 'claude-opus-5-5' },
  { id: 'r4', order: 4, name: 'Còn lại', when: {}, modelId: 'claude-sonnet-5-5' },
]
export function simulate(agentId: string, b: { priority?: string; tokens?: number; dataClass?: string }) {
  const p = resolvePolicy(policyOf(agentId))
  if (p.routing !== 'RULES') return { modelId: p.resolved.modelId ?? null, ruleId: null, explanation: p.routing === 'FIXED' ? 'Chế độ Cố định: luôn dùng model chính, lần lượt thử dự phòng khi lỗi.' : 'Chế độ Thang bậc: bắt đầu từ model nhẹ, leo thang khi kết quả không đạt.' }
  const hit = [...rules].sort((x, y) => x.order - y.order).find((r) => (!r.when.priority || r.when.priority === b.priority) && (r.when.minTokens == null || (b.tokens ?? 0) >= r.when.minTokens) && (r.when.maxTokens == null || (b.tokens ?? 0) <= r.when.maxTokens) && (!r.when.dataClass || r.when.dataClass === b.dataClass))
  if (!hit) return { modelId: null, ruleId: null, explanation: 'Không luật nào khớp.' }
  const ok = resolvePolicy({ ...policyOf(agentId), primaryId: hit.modelId, fallbackIds: [], escalationId: null }) // luật chọn model nhưng riêng tư / sức khoẻ vẫn áp dụng
  return ok.resolved.modelId ? { modelId: hit.modelId, ruleId: hit.id, explanation: `Khớp luật ${hit.order} "${hit.name}".` } : { modelId: null, ruleId: hit.id, explanation: `Khớp luật ${hit.order} "${hit.name}" nhưng model bị chặn: ${ok.resolved.blockedBy}` }
}
