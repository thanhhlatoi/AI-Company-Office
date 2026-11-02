import { ApiError } from '../../api/http'
import type { Comparison, ModelProfileInput } from '../../types/models'
import { mockDb } from '../db'
import { mockDevices } from '../devices'
import { publishEvent } from '../work'
import { models, modelView, policyOf, resolvePolicy, rules } from './modelsData'
import { testModel } from './routesWrite'
import { iso } from './toolsData'

const fail = (status: number, message: string): never => { throw new ApiError(status, `Mock ${status}: ${message}`, { message }) }
const saved: Comparison[] = []
let seq = 100

function estimate(prompt: string, ids: string[]) {
  const inT = Math.ceil(prompt.length / 3.5), outT = 400 // giả định đầu ra ~400 token
  const perModel = ids.map((id) => { const m = models.find((x) => x.id === id) ?? fail(404, `không có model ${id}`); return { modelId: id, micro: Math.round((inT * m.inputPerMTokMicro + outT * m.outputPerMTokMicro) / 1_000_000) } })
  return { estimateMicro: perModel.reduce((s, x) => s + x.micro, 0), perModel }
}
const check = (c: ModelProfileInput) => {
  if (c.dataClass === 'CLOUD' && !c.secretId) fail(400, 'Model CLOUD cần chọn một bí mật (khoá API)')
  if (c.dataClass === 'LOCAL' && !c.baseUrl) fail(400, 'Model LOCAL cần địa chỉ máy chạy (baseUrl)')
}

/** Mock hồ sơ model / luật / so sánh (Bước 4). undefined = không phải route này. */
export function modelsRoute(method: string, path: string, body: unknown): unknown {
  const b = (body ?? {}) as Record<string, unknown>
  let m: RegExpMatchArray | null
  if (method === 'GET' && path === '/model-policies') return mockDb.agents.map((a) => resolvePolicy(policyOf(a.id)))
  if (method === 'GET' && path === '/comparisons') return saved
  if (method === 'POST' && path === '/models') {
    const c = b as unknown as ModelProfileInput; check(c)
    const id = `${c.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'model'}-${++seq}`
    const p = { ...c, id, inUse: 0, health: { status: 'UP' as const, consecutiveErrors: 0, checkedAt: null }, baseUrl: c.baseUrl ?? null, secretId: c.secretId ?? null, deviceId: c.deviceId ?? null }
    models.push(p); return p
  }
  if (method === 'PUT' && (m = path.match(/^\/models\/([^/]+)$/))) {
    const p = models.find((x) => x.id === m![1]) ?? fail(404, `không có model ${m[1]}`), c = b as unknown as ModelProfileInput; check(c)
    return Object.assign(p, c, { baseUrl: c.baseUrl ?? null, secretId: c.secretId ?? null, deviceId: c.deviceId ?? null })
  }
  if (method === 'POST' && (m = path.match(/^\/models\/([^/]+)\/check$/))) {
    const p = models.find((x) => x.id === m![1]) ?? fail(404, `không có model ${m[1]}`)
    const off = p.deviceId && mockDevices.find((d) => d.id === p.deviceId)?.status === 'OFFLINE'
    const down = off || p.health.status === 'DOWN' && !!p.deviceId // mock: model local DOWN thì vẫn lỗi
    const health = down ? { status: 'DOWN' as const, consecutiveErrors: p.health.consecutiveErrors + 1, checkedAt: iso(Date.now()) } : { status: 'UP' as const, consecutiveErrors: 0, checkedAt: iso(Date.now()) }
    p.health = health
    publishEvent({ type: 'model.health_changed', modelId: p.id, health: modelView(p).health })
    return { ok: !down, latencyMs: down ? 0 : 120 + p.id.length * 7, error: down ? (off ? 'Máy chạy model đang OFFLINE' : 'Không kết nối được tới địa chỉ model') : null, health }
  }
  if (method === 'PUT' && path === '/routing-rules') {
    const list = (b.rules ?? []) as { id?: string; name: string; when: object; modelId: string }[]
    if (list.some((r) => !models.some((x) => x.id === r.modelId))) fail(400, 'Luật trỏ tới model không tồn tại')
    rules.splice(0, rules.length, ...list.map((r, i) => ({ id: r.id || `r${++seq}`, order: i + 1, name: r.name, when: r.when as never, modelId: r.modelId })))
    return rules
  }
  if (method === 'POST' && path === '/comparisons/estimate') return estimate(String(b.prompt ?? ''), (b.modelIds ?? []) as string[])
  if (method === 'POST' && path === '/comparisons/run') {
    const ids = (b.modelIds ?? []) as string[], prompt = String(b.prompt ?? '')
    if (ids.length < 2 || ids.length > 4) fail(400, 'Chọn từ 2 đến 4 model')
    return { id: `cmp-run-${++seq}`, prompt, createdAt: iso(Date.now()), estimateMicro: estimate(prompt, ids).estimateMicro, results: ids.map((id) => testModel(id, prompt)) }
  }
  if (method === 'POST' && path === '/comparisons') { const c = { ...(b as unknown as Comparison), id: `cmp-${++seq}` }; saved.unshift(c); return c }
  return undefined
}
