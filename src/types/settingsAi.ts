import { z } from 'zod'

// Hợp đồng API ĐỀ XUẤT cho /settings/ai (BE chưa có; xem docs/settings-ai.md).
// zod mặc định BỎ các khoá lạ: nếu BE lỡ trả `apiKey`, dữ liệu đã parse cũng không chứa nó. Không dùng .passthrough().

const ReasoningEffortSchema = z.enum(['', 'none', 'low', 'medium', 'high'])
export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>

/** local.small / local.strong / planner là khoá cố định; thêm khoá tuỳ chỉnh được */
export const FIXED_ALIASES = ['local.small', 'local.strong', 'planner'] as const

export const SettingsAiSchema = z.object({
  applyMode: z.enum(['live', 'restart']),
  source: z.enum(['env', 'database']),
  /** BE báo đã bật xác thực chủ chưa; thiếu = coi như chưa bật */
  authEnabled: z.boolean().optional(),
  llm: z.object({
    provider: z.enum(['fake', 'local']),
    baseUrl: z.string(),
    model: z.string(),
    reasoningEffort: ReasoningEffortSchema,
    timeoutSec: z.number(),
    maxOutputTokens: z.number(),
    /** Chỉ cho biết đã đặt khoá chưa, KHÔNG BAO GIỜ có giá trị khoá */
    apiKeySet: z.boolean(),
    viaOmniroute: z.boolean(),
    modelAliases: z.record(z.string(), z.string().optional()),
  }),
  ollama: z.object({ baseUrl: z.string(), defaultModel: z.string() }),
  omniroute: z.object({ enabled: z.boolean(), baseUrl: z.string(), dashboardUrl: z.string(), apiKeySet: z.boolean() }),
  hermes: z.object({ enabled: z.boolean(), planner: z.enum(['hermes', 'llm']), baseUrl: z.string(), healthy: z.boolean().nullable(), adminConfigured: z.boolean() }),
})
export type SettingsAi = z.infer<typeof SettingsAiSchema>

/** PUT từng phần. Khoá bí mật GHI MỘT CHIỀU: chuỗi = đặt/đổi, null = xoá, vắng mặt = giữ nguyên. */
export interface SettingsAiPatch {
  llm?: Partial<Omit<SettingsAi['llm'], 'apiKeySet'>> & { apiKey?: string | null }
  ollama?: Partial<SettingsAi['ollama']>
  omniroute?: Partial<Omit<SettingsAi['omniroute'], 'apiKeySet' | 'dashboardUrl'>> & { apiKey?: string | null }
  hermes?: Partial<Pick<SettingsAi['hermes'], 'enabled' | 'planner' | 'baseUrl'>> & { adminToken?: string | null }
}

type TestTarget = 'ollama' | 'omniroute' | 'llm' | 'hermes'
export interface TestBody { target: TestTarget; overrides?: { baseUrl?: string; model?: string; apiKey?: string } }

export const TestResultSchema = z.object({
  ok: z.boolean(),
  latencyMs: z.number(),
  message: z.string(),
  errorCode: z.string().optional(),
  /** (đề xuất thêm so với bản gốc) để hiện mã tra log khi thử lỗi */
  requestId: z.string().optional(),
  models: z.array(z.string()).optional(),
  sample: z.string().optional(),
})
export type TestResult = z.infer<typeof TestResultSchema>

export const ModelListSchema = z.object({
  models: z.array(z.object({ id: z.string(), label: z.string().optional(), supportsTools: z.boolean().optional(), thinking: z.boolean().optional() })),
})
export type ModelList = z.infer<typeof ModelListSchema>

const HealthSchema = z.object({
  state: z.enum(['up', 'degraded', 'down', 'unknown']),
  latencyMs: z.number().optional(),
  checkedAt: z.string(),
  detail: z.string().optional(),
})
export type Health = z.infer<typeof HealthSchema>
export const StatusSchema = z.object({ ollama: HealthSchema, omniroute: HealthSchema, llm: HealthSchema, hermes: HealthSchema })
export type AiStatus = z.infer<typeof StatusSchema>
