import { z } from 'zod'

// ---- Kết nối 9Router (BE agent-office-be: /api/llm/*, /api/model-profiles) ----
export const LlmProviderSchema = z.object({ name: z.string(), modelCount: z.number() })
export type LlmProvider = z.infer<typeof LlmProviderSchema>

/** Các trường sau thiếu/null = 9Router không báo (hoặc BE chưa nâng cấp). */
export const LlmModelSchema = z.object({
  id: z.string(), ownedBy: z.string().nullish(),
  contextWindow: z.number().nullish(), maxOutput: z.number().nullish(),
  vision: z.boolean().nullish(), tools: z.boolean().nullish(), reasoning: z.boolean().nullish(),
})
export type LlmModel = z.infer<typeof LlmModelSchema>

export const GatewayTestSchema = z.object({
  model: z.string(), ok: z.boolean(), latencyMs: z.number(),
  inputTokens: z.number().default(0), outputTokens: z.number().default(0), error: z.string().nullish(),
})
export type GatewayTest = z.infer<typeof GatewayTestSchema>
