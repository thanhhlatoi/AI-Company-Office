import { z } from 'zod'
import { Id } from './common.ts'
import { AccessSchema } from './knowledge.ts'

// ---- Cấu hình Agent Studio + mẫu agent (GIẢ ĐỊNH) ----
export const PromptVersionSchema = z.object({ id: Id, agentId: Id, version: z.number(), prompt: z.string(), note: z.string().default(''), author: z.string().default(''), createdAt: z.string() })
export type PromptVersion = z.infer<typeof PromptVersionSchema>

export const LintIssueSchema = z.object({ line: z.number(), severity: z.enum(['info', 'warning', 'error']), code: z.string(), message: z.string() })
export type LintIssue = z.infer<typeof LintIssueSchema>
export const LintResultSchema = z.object({ issues: z.array(LintIssueSchema), tokenEstimate: z.number().default(0) })

export const MemoryPolicySchema = z.object({
  enabled: z.boolean().default(false),
  autoLoad: z.number().int().default(5), // số mục nạp đầu task
  autoSummarize: z.boolean().default(false), // có chi phí
  requireReview: z.boolean().default(true),
})
export type MemoryPolicy = z.infer<typeof MemoryPolicySchema>

/** Cấu hình ngoài hồ sơ cơ bản của agent (GET/PUT /agents/{id}/studio) */
export const StudioConfigSchema = z.object({
  agentId: Id,
  templateId: Id.nullish(), templateVersion: z.number().nullish(), latestTemplateVersion: z.number().nullish(),
  memoryPolicy: MemoryPolicySchema.prefault({}),
  collections: z.array(z.object({ collectionId: Id, access: AccessSchema })).default([]),
  namespaces: z.array(z.object({ namespaceId: Id, access: AccessSchema })).default([]),
  dailyBudgetMicro: z.number().int().nullish(),
})
export type StudioConfig = z.infer<typeof StudioConfigSchema>

export const TemplateVariableSchema = z.object({ key: z.string(), label: z.string(), default: z.string().default(''), required: z.boolean().default(false) })
export const AgentTemplateSchema = z.object({
  id: Id, name: z.string(), group: z.string(),
  kind: z.enum(['BUILTIN', 'MINE', 'IMPORTED']),
  version: z.number().default(1),
  description: z.string().default(''),
  systemPrompt: z.string(),
  promptNotes: z.array(z.object({ section: z.string(), note: z.string() })).default([]), // chú thích 8 phần
  variables: z.array(TemplateVariableSchema).default([]),
  suggestedTools: z.array(z.object({ toolId: Id, scope: z.record(z.string(), z.unknown()).default({}) })).default([]),
  modelRequirement: z.object({ preferLocal: z.boolean().default(false), needsToolUse: z.boolean().default(false), minTier: z.enum(['FAST', 'BALANCED', 'POWER']).nullish() }).prefault({}),
  locked: z.boolean().default(false), // mẫu dựng sẵn: chỉ "Nhân bản để sửa"
  createdAt: z.string(),
})
export type AgentTemplate = z.infer<typeof AgentTemplateSchema>

/** Nội dung một mẫu khi lưu / nhập / xuất (không có id, loại, ngày — BE cấp). Prompt và biến là dữ liệu KHÔNG tin cậy khi nhập. */
export const AgentTemplateInputSchema = z.object({
  name: z.string().trim().min(1, 'Mẫu cần có tên').max(80),
  group: z.string().trim().min(1).max(40).default('Đã nhập'),
  description: z.string().max(500).default(''),
  systemPrompt: z.string().min(10, 'Prompt tối thiểu 10 ký tự').max(20000),
  promptNotes: z.array(z.object({ section: z.string(), note: z.string() })).max(20).default([]),
  variables: z.array(TemplateVariableSchema).max(30).default([]),
  suggestedTools: z.array(z.object({ toolId: z.string(), scope: z.record(z.string(), z.unknown()).default({}) })).max(30).default([]),
  modelRequirement: z.object({ preferLocal: z.boolean().default(false), needsToolUse: z.boolean().default(false), minTier: z.enum(['FAST', 'BALANCED', 'POWER']).nullish() }).prefault({}),
})
export type AgentTemplateInput = z.infer<typeof AgentTemplateInputSchema>

/** Tạo agent từ mẫu — MỘT giao dịch: hồ sơ + model + quyền + dữ liệu + ngân sách. */
export interface InstantiateInput {
  name: string; role: string; departmentId: string | null; variables: Record<string, string>
  model: { primaryId: string; fallbackIds: string[]; escalationId: string | null; routing: 'FIXED' | 'RULES' | 'TIERED'; privacy: 'ANY' | 'TRUSTED' | 'LOCAL_ONLY' }
  grants: { toolId: string; scope: Record<string, unknown>; limits: { maxCallsPerTask?: number | null; maxPerMinute?: number | null; expiresAt?: string | null }; alwaysApprove: boolean; secretId?: string | null }[]
  collections: { collectionId: string; access: 'NONE' | 'READ' | 'WRITE' }[]
  namespaces: { namespaceId: string; access: 'NONE' | 'READ' | 'WRITE' }[]
  memoryPolicy: { enabled: boolean; autoLoad: number; autoSummarize: boolean; requireReview: boolean }
  dailyBudgetMicro: number | null
}
