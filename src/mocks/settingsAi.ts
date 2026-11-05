import { ApiError } from '../api/http'
import type { AiStatus, Health, ModelList, SettingsAi, SettingsAiPatch, TestBody, TestResult } from '../types/settingsAi'

// Mock /settings/ai. Kịch bản chọn bằng URL: ?mock=ok|env|down|slow|timeout|badshape|restart|fake (mặc định ok).
// Mock KHÔNG giữ khoá thật: PUT chỉ lật cờ apiKeySet, giá trị khoá bị bỏ ngay.
type Scenario = 'ok' | 'env' | 'down' | 'slow' | 'timeout' | 'badshape' | 'restart' | 'fake'
const SCENARIOS: Scenario[] = ['ok', 'env', 'down', 'slow', 'timeout', 'badshape', 'restart', 'fake']
const scenario = (): Scenario => {
  const v = new URLSearchParams(window.location.search).get('mock') as Scenario | null
  return v && SCENARIOS.includes(v) ? v : 'ok'
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const rid = () => `req-${Math.random().toString(36).slice(2, 10)}`
const fail = (status: number, code: string, message: string): never => { throw new ApiError(status, `HTTP ${status}`, { code, message, requestId: rid() }) }

const seed = (sc: Scenario): SettingsAi => ({
  applyMode: sc === 'restart' ? 'restart' : 'live',
  source: sc === 'env' ? 'env' : 'database',
  authEnabled: false,
  llm: {
    provider: sc === 'fake' ? 'fake' : 'local', baseUrl: 'http://localhost:20128/v1', model: 'local.small', reasoningEffort: 'none', timeoutSec: 300, maxOutputTokens: 2048,
    apiKeySet: sc !== 'fake', viaOmniroute: sc !== 'fake',
    modelAliases: { 'local.small': 'combo-nho-mien-phi', 'local.strong': 'combo-manh-uu-tien-local', planner: 'combo-manh-uu-tien-local' },
  },
  ollama: { baseUrl: 'http://192.168.1.184:11434/v1', defaultModel: 'qwen3.6-64k:latest' },
  omniroute: { enabled: sc !== 'fake', baseUrl: 'http://localhost:20128/v1', dashboardUrl: 'http://localhost:20128', apiKeySet: sc !== 'fake' },
  hermes: { enabled: true, planner: 'hermes', baseUrl: 'http://localhost:8642', healthy: sc !== 'down', adminConfigured: false },
})

let cur: Scenario | null = null
let db: SettingsAi
const state = () => { const sc = scenario(); if (cur !== sc) { cur = sc; db = seed(sc) } return db }

const health = (state: Health['state'], latencyMs?: number, detail?: string): Health => ({ state, latencyMs, detail, checkedAt: new Date().toISOString() })
const status = (sc: Scenario): AiStatus => sc === 'down'
  ? { ollama: health('down', undefined, 'Connection refused'), omniroute: health('down', undefined, 'Connection refused (chưa chạy?)'), llm: health('down', undefined, 'LLM_UNAVAILABLE'), hermes: health('down', undefined, 'Không kết nối được') }
  : sc === 'slow'
    ? { ollama: health('degraded', 4200, 'Phản hồi chậm (đang nạp model?)'), omniroute: health('up', 90), llm: health('degraded', 6100), hermes: health('up', 120) }
    : { ollama: health('up', 38), omniroute: health('up', 12), llm: health(db.llm.provider === 'fake' ? 'unknown' : 'up', 820, db.llm.provider === 'fake' ? 'Đang dùng AI giả' : undefined), hermes: health('up', 64) }

const OLLAMA_MODELS: ModelList['models'] = [
  { id: 'qwen3.6-64k:latest', label: 'qwen3.6-64k (mặc định)', supportsTools: true, thinking: true },
  { id: 'qwen3.6:35b-a3b-q4_K_M', supportsTools: true, thinking: true },
  { id: 'translator-4b:latest', label: 'Model 4B dịch thuật (tên mẫu)' },
]
const COMBOS: ModelList['models'] = [
  { id: 'combo-nho-mien-phi', label: 'Nhỏ, miễn phí (Ollama)', supportsTools: true },
  { id: 'combo-manh-uu-tien-local', label: 'Mạnh, ưu tiên local, dự phòng cloud', supportsTools: true, thinking: true },
  { id: 'combo-cloud-du-phong', label: 'Cloud dự phòng (tính phí)', supportsTools: true },
]

async function test(sc: Scenario, { target }: TestBody): Promise<TestResult> {
  if (sc === 'timeout') { await sleep(2500); return { ok: false, latencyMs: db.llm.timeoutSec * 1000, message: `Quá hạn ${db.llm.timeoutSec} giây không có phản hồi`, errorCode: 'TIMEOUT', requestId: rid() } }
  if (sc === 'down') {
    const msg = target === 'omniroute' ? 'connect ECONNREFUSED 127.0.0.1:20128 (OmniRoute chưa chạy?)' : 'connect ECONNREFUSED 192.168.1.184:11434'
    return { ok: false, latencyMs: 31, message: msg, errorCode: 'LLM_UNAVAILABLE', requestId: rid() }
  }
  if (sc === 'slow') await sleep(4000)
  const latencyMs = sc === 'slow' ? 4100 : target === 'llm' ? 820 : 40
  if (target === 'hermes') return { ok: true, latencyMs, message: 'Hermes phản hồi bình thường' }
  if (target === 'llm') return { ok: true, latencyMs, message: 'AI trả lời bình thường', sample: 'Chào' }
  const models = (target === 'ollama' ? OLLAMA_MODELS : COMBOS).map((m) => m.id)
  return { ok: true, latencyMs, message: `Kết nối được, thấy ${models.length} model`, models }
}

/** Trả undefined nếu path không thuộc /settings/ai (để mockApi thử nhóm khác). */
export async function settingsAiRequest(method: string, path: string, body: unknown): Promise<unknown> {
  const sc = scenario()
  const s = state()
  const [p, qs = ''] = path.split('?')
  if (p === '/settings/ai' && method === 'GET') return sc === 'badshape' ? { applyMode: 'sometimes', llm: null } : s
  if (p === '/settings/ai' && method === 'PUT') {
    if (s.source === 'env') return fail(409, 'SETTINGS_READ_ONLY', 'Cấu hình đang lấy từ .env, không sửa được từ giao diện')
    const patch = body as SettingsAiPatch
    const { apiKey: llmKey, ...llm } = patch.llm ?? {}
    const { apiKey: omniKey, ...omni } = patch.omniroute ?? {}
    const { adminToken, ...herm } = patch.hermes ?? {}
    Object.assign(s.llm, llm); Object.assign(s.ollama, patch.ollama); Object.assign(s.omniroute, omni); Object.assign(s.hermes, herm)
    if (adminToken !== undefined) s.hermes.adminConfigured = adminToken !== null
    if (llmKey !== undefined) s.llm.apiKeySet = llmKey !== null
    if (omniKey !== undefined) s.omniroute.apiKeySet = omniKey !== null
    return s
  }
  if (p === '/settings/ai/status' && method === 'GET') return status(sc)
  if (p === '/settings/ai/models' && method === 'GET') {
    if (sc === 'down') return fail(502, 'LLM_UNAVAILABLE', 'Không kết nối được tới nguồn model')
    return { models: new URLSearchParams(qs).get('source') === 'omniroute' ? COMBOS : OLLAMA_MODELS } satisfies ModelList
  }
  if (p === '/settings/ai/test' && method === 'POST') return test(sc, body as TestBody)
  return undefined
}
