import { z } from 'zod'
import { Id, pageOf } from './common'

// ---- Công cụ, quyền, bí mật (GIẢ ĐỊNH, xem docs/BE_API_SPEC_PART3.md). FE KHÔNG BAO GIỜ nhận giá trị bí mật. ----
export const RiskLevelSchema = z.enum(['READ', 'WRITE_INTERNAL', 'EXTERNAL', 'MONEY', 'DESTRUCTIVE'])
export type RiskLevel = z.infer<typeof RiskLevelSchema>

export const ToolSchema = z.object({
  id: Id,
  name: z.string(),
  group: z.string(),
  risk: RiskLevelSchema,
  description: z.string().default(''),
  /** JSON Schema (tập con) của PHẠM VI: dùng để dựng biểu mẫu. Khoá `x-secretKind` = chọn bí mật theo loại. */
  scopeSchema: z.record(z.string(), z.unknown()).default({}),
  readsExternal: z.boolean().default(false), // "nguồn nhiễm": đọc nội dung từ bên ngoài (web, thư đến)
  readsPrivate: z.boolean().default(false), // đọc dữ liệu riêng (kho, bộ nhớ, thư)
  sendsOut: z.boolean().default(false), // gửi thông tin ra ngoài
  enabled: z.boolean().default(true), // công tắc toàn hệ thống ("Tắt khẩn cấp")
  requiresAdminFlag: z.boolean().default(false), // MONEY / DESTRUCTIVE: phải bật cờ ở trang quản trị
  adminFlagOn: z.boolean().default(false),
  agentCount: z.number().default(0),
})
export type Tool = z.infer<typeof ToolSchema>

export const GrantLimitsSchema = z.object({
  maxCallsPerTask: z.number().int().nullish(),
  maxPerMinute: z.number().int().nullish(),
  expiresAt: z.string().nullish(),
})
export const GrantSchema = z.object({
  id: Id, agentId: Id, toolId: Id,
  scope: z.record(z.string(), z.unknown()).default({}),
  limits: GrantLimitsSchema.prefault({}),
  /** Chỉ được thêm chặt: đặt true thì mọi lời gọi đều chờ duyệt */
  alwaysApprove: z.boolean().default(false),
  secretId: Id.nullish(),
  createdAt: z.string(), updatedAt: z.string(),
})
export type Grant = z.infer<typeof GrantSchema>

export interface GrantInput { toolId: string; scope: Record<string, unknown>; limits: z.input<typeof GrantLimitsSchema>; alwaysApprove: boolean; secretId?: string | null }
/** Xem trước / lưu thay đổi quyền của một agent: thêm-sửa `grants`, bỏ `remove` (toolId). */
export interface PermissionChange { grants: GrantInput[]; remove: string[]; reason?: string }

export const EffectiveToolSchema = z.object({
  toolId: Id,
  allowed: z.boolean(),
  risk: RiskLevelSchema,
  needsApproval: z.boolean().default(false),
  scopeSummary: z.string().default(''),
  expiresAt: z.string().nullish(),
  /** Có quyền được cấp nhưng đang bị chặn: tắt khẩn cấp, thiếu cờ quản trị, hết hạn */
  blockedReason: z.string().nullish(),
})
export type EffectiveTool = z.infer<typeof EffectiveToolSchema>

export const EffectivePermissionsSchema = z.object({
  agentId: Id,
  tools: z.array(EffectiveToolSchema),
  /** Ba cạnh của "tam giác rủi ro" (BE tính; BE tự buộc duyệt khi đủ cả ba, không tắt được) */
  privateData: z.boolean().default(false),
  readsExternal: z.boolean().default(false),
  sendsOut: z.boolean().default(false),
})
export type EffectivePermissions = z.infer<typeof EffectivePermissionsSchema>

export const DecisionSchema = z.enum(['ALLOWED', 'DENIED', 'NEEDS_APPROVAL'])
export type Decision = z.infer<typeof DecisionSchema>
export const CheckResultSchema = z.object({ decision: DecisionSchema, reason: z.string().default('') })
export type CheckResult = z.infer<typeof CheckResultSchema>

export const ToolCallLogSchema = z.object({
  id: Id, at: z.string(), agentId: Id, toolId: Id,
  decision: DecisionSchema,
  reason: z.string().default(''),
  taskId: Id.nullish(),
  args: z.record(z.string(), z.unknown()).default({}), // BE đã che bí mật
  tainted: z.boolean().default(false), // task đã đọc nội dung bên ngoài
})
export type ToolCallLog = z.infer<typeof ToolCallLogSchema>
export const ToolCallPageSchema = pageOf(ToolCallLogSchema)

export const SecretSchema = z.object({
  id: Id, name: z.string(), kind: z.string(),
  createdAt: z.string(), rotatedAt: z.string().nullish(), lastUsedAt: z.string().nullish(),
  usedBy: z.array(z.object({ agentId: Id, toolId: Id })).default([]),
})
export type Secret = z.infer<typeof SecretSchema>

export const PermissionAuditSchema = z.object({
  id: Id, at: z.string(), actor: z.string(), agentId: Id.nullish(), toolId: Id.nullish(),
  action: z.enum(['GRANT', 'UPDATE', 'REVOKE', 'KILL_SWITCH', 'ADMIN_FLAG']),
  before: z.record(z.string(), z.unknown()).nullish(), after: z.record(z.string(), z.unknown()).nullish(),
  reason: z.string().nullish(),
})
export type PermissionAudit = z.infer<typeof PermissionAuditSchema>
export const PermissionAuditPageSchema = pageOf(PermissionAuditSchema)
