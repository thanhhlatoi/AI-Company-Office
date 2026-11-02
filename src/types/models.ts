import { z } from 'zod'
import { Id, Micro } from './common'

// ---- Hồ sơ model, chính sách của agent, luật định tuyến (GIẢ ĐỊNH) ----
export const DataClassSchema = z.enum(['LOCAL', 'CLOUD'])
export type DataClass = z.infer<typeof DataClassSchema>
export const HealthSchema = z.object({
  status: z.enum(['UP', 'DEGRADED', 'DOWN']),
  checkedAt: z.string().nullish(),
  consecutiveErrors: z.number().default(0),
})
export type Health = z.infer<typeof HealthSchema>

export const ModelProfileSchema = z.object({
  id: Id, label: z.string(),
  provider: z.string(), modelId: z.string(),
  baseUrl: z.string().nullish(),
  secretId: Id.nullish(), // chỉ tham chiếu bí mật, không có giá trị
  dataClass: DataClassSchema,
  tier: z.enum(['FAST', 'BALANCED', 'POWER']),
  capabilities: z.object({ toolUse: z.boolean().default(false), json: z.boolean().default(false), vision: z.boolean().default(false) }).prefault({}),
  contextTokens: z.number().default(0),
  maxConcurrent: z.number().default(1),
  inUse: z.number().default(0),
  inputPerMTokMicro: Micro.default(0),
  outputPerMTokMicro: Micro.default(0),
  health: HealthSchema,
  deviceId: Id.nullish(), // máy chạy model local (phòng Hạ tầng)
})
export type ModelProfile = z.infer<typeof ModelProfileSchema>

export const RoutingModeSchema = z.enum(['FIXED', 'RULES', 'TIERED'])
export const PrivacyModeSchema = z.enum(['ANY', 'TRUSTED', 'LOCAL_ONLY'])
export type RoutingMode = z.infer<typeof RoutingModeSchema>
export type PrivacyMode = z.infer<typeof PrivacyModeSchema>

export const ModelPolicySchema = z.object({
  agentId: Id,
  primaryId: Id,
  fallbackIds: z.array(Id).default([]),
  escalationId: Id.nullish(),
  routing: RoutingModeSchema.default('FIXED'),
  privacy: PrivacyModeSchema.default('ANY'),
  /** BE giải: model sẽ được dùng ngay lúc này; null = "Không có model hợp lệ" và `blockedBy` nói ràng buộc nào chặn */
  resolved: z.object({ modelId: Id.nullish(), blockedBy: z.string().nullish() }).prefault({}),
})
export type ModelPolicy = z.infer<typeof ModelPolicySchema>
export type ModelPolicyInput = Pick<ModelPolicy, 'primaryId' | 'fallbackIds' | 'escalationId' | 'routing' | 'privacy'>

export const RoutingRuleSchema = z.object({
  id: Id, order: z.number(), name: z.string(),
  when: z.object({
    priority: z.enum(['HIGH', 'NORMAL', 'LOW']).nullish(),
    minTokens: z.number().nullish(), maxTokens: z.number().nullish(),
    departmentId: Id.nullish(), agentId: Id.nullish(),
    dataClass: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']).nullish(),
  }).prefault({}),
  modelId: Id,
})
export type RoutingRule = z.infer<typeof RoutingRuleSchema>

export const ModelTestResultSchema = z.object({
  modelId: Id,
  output: z.string().default(''),
  inputTokens: z.number().default(0), outputTokens: z.number().default(0),
  costMicro: Micro.default(0), latencyMs: z.number().default(0),
  error: z.string().nullish(),
})
export type ModelTestResult = z.infer<typeof ModelTestResultSchema>

export const ComparisonSchema = z.object({
  id: Id, prompt: z.string(), createdAt: z.string(), estimateMicro: Micro.default(0),
  results: z.array(ModelTestResultSchema),
})
export type Comparison = z.infer<typeof ComparisonSchema>

export const SimulationSchema = z.object({ modelId: Id.nullish(), ruleId: Id.nullish(), explanation: z.string() })

/** Tạo / sửa hồ sơ model. Bí mật chỉ gửi `secretId` (tham chiếu), không bao giờ giá trị. */
export const ModelProfileInputSchema = z.object({
  label: z.string().min(1, 'Cần tên hiển thị'), provider: z.string().min(1, 'Cần nhà cung cấp'), modelId: z.string().min(1, 'Cần mã model'),
  baseUrl: z.string().nullish(), secretId: z.string().nullish(),
  dataClass: DataClassSchema, tier: z.enum(['FAST', 'BALANCED', 'POWER']),
  capabilities: z.object({ toolUse: z.boolean(), json: z.boolean(), vision: z.boolean() }),
  contextTokens: z.number().int().min(1), maxConcurrent: z.number().int().min(1),
  inputPerMTokMicro: Micro.min(0), outputPerMTokMicro: Micro.min(0),
  deviceId: z.string().nullish(),
})
export type ModelProfileInput = z.infer<typeof ModelProfileInputSchema>

/** Kết quả "Kiểm tra kết nối": cập nhật cả sức khoẻ của hồ sơ */
export const ConnectionCheckSchema = z.object({ ok: z.boolean(), latencyMs: z.number().default(0), error: z.string().nullish(), health: HealthSchema })
export const EstimateSchema = z.object({ estimateMicro: Micro, perModel: z.array(z.object({ modelId: Id, micro: Micro })) })
