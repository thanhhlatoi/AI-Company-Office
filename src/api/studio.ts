import { z } from 'zod'
import { AgentSchema } from '../types'
import { ChunkPageSchema, CollectionSchema, DocumentPageSchema, EvalSetSchema, SearchResultSchema } from '../types/knowledge'
import { MemoryNamespaceSchema, MemoryPageSchema } from '../types/memory'
import { ComparisonSchema, ConnectionCheckSchema, EstimateSchema, ModelPolicySchema, ModelProfileSchema, ModelTestResultSchema, RoutingRuleSchema, SimulationSchema, type Comparison, type ModelPolicyInput, type ModelProfileInput, type RoutingRule } from '../types/models'
import { AgentTemplateSchema, LintResultSchema, PromptVersionSchema, StudioConfigSchema } from '../types/studio'
import { CheckResultSchema, EffectivePermissionsSchema, GrantSchema, PermissionAuditPageSchema, SecretSchema, ToolCallPageSchema, ToolSchema, type PermissionChange } from '../types/tools'
import { request } from './http'
import { qs } from './query'

// Các lệnh ĐỌC (và xem trước / kiểm tra, không đổi dữ liệu) của Prompt 4D. Ghi làm ở từng bước tương ứng.
// Hợp đồng GIẢ ĐỊNH: docs/BE_API_SPEC_PART3.md.
export const PAGE = 40

// ---- Agent Studio ----
export const getStudio = (agentId: string) => request('GET', `/agents/${agentId}/studio`, StudioConfigSchema)
export const listPromptVersions = (agentId: string) => request('GET', `/agents/${agentId}/prompt-versions`, z.array(PromptVersionSchema))
export const postLint = (prompt: string) => request('POST', '/prompt/lint', LintResultSchema, { prompt })

// ---- Công cụ và quyền ----
export const listTools = () => request('GET', '/tools', z.array(ToolSchema))
export const listGrants = (agentId?: string) => request('GET', `/grants${qs({ agentId })}`, z.array(GrantSchema))
export const getEffective = (agentId: string) => request('GET', `/agents/${agentId}/effective-permissions`, EffectivePermissionsSchema)
/** "Sau thay đổi agent này sẽ có thể..." — tính quyền hiệu lực của bản thay đổi chưa lưu */
export const previewPermissions = (agentId: string, change: PermissionChange) => request('POST', `/agents/${agentId}/permissions/preview`, EffectivePermissionsSchema, change)
/** Thử quyền: KHÔNG thực thi */
export const checkTool = (toolId: string, agentId: string, args: Record<string, unknown>) => request('POST', `/tools/${toolId}/check`, CheckResultSchema, { agentId, args })
export const listEffectiveAll = () => request('GET', '/effective-permissions', z.array(EffectivePermissionsSchema))

export interface ToolCallFilters { agentId?: string; toolId?: string; decision?: string; denied?: boolean }
export const listToolCalls = (f: ToolCallFilters, cursor?: string) => request('GET', `/tool-calls${qs({ ...f, cursor, limit: PAGE })}`, ToolCallPageSchema)
export const listSecrets = () => request('GET', '/secrets', z.array(SecretSchema))
export const listPermissionAudit = (cursor?: string) => request('GET', `/permission-audit${qs({ cursor, limit: PAGE })}`, PermissionAuditPageSchema)

// ---- Model ----
export const listModelProfiles = () => request('GET', '/models', z.array(ModelProfileSchema))
export const getModelPolicy = (agentId: string) => request('GET', `/agents/${agentId}/model-policy`, ModelPolicySchema)
export const listRoutingRules = () => request('GET', '/routing-rules', z.array(RoutingRuleSchema))

// ---- Kho tài liệu ----
export const listCollections = () => request('GET', '/collections', z.array(CollectionSchema))
export const getCollection = (id: string) => request('GET', `/collections/${id}`, CollectionSchema)
export const listDocuments = (collectionId: string, cursor?: string) => request('GET', `/collections/${collectionId}/documents${qs({ cursor, limit: PAGE })}`, DocumentPageSchema)
export const listChunks = (documentId: string, cursor?: string) => request('GET', `/documents/${documentId}/chunks${qs({ cursor, limit: 20 })}`, ChunkPageSchema)
/** Tìm thử với tư cách `asAgent` (bỏ trống = Quản trị, thấy hết) */
export const searchCollection = (collectionId: string, q: string, asAgent?: string) => request('GET', `/collections/${collectionId}/search${qs({ q, asAgent })}`, SearchResultSchema)
export const getEvalSet = (collectionId: string) => request('GET', `/collections/${collectionId}/eval`, EvalSetSchema)

// ---- Bộ nhớ ----
export interface MemoryFilters { agentId?: string; namespaceId?: string; q?: string; kind?: string; origin?: string; status?: string; subject?: string; pinned?: boolean }
export const listMemory = (f: MemoryFilters, cursor?: string) => request('GET', `/memory${qs({ ...f, cursor, limit: PAGE })}`, MemoryPageSchema)
export const listNamespaces = () => request('GET', '/memory/namespaces', z.array(MemoryNamespaceSchema))

// ---- Mẫu agent ----
export const listTemplates = () => request('GET', '/templates', z.array(AgentTemplateSchema))
export const getTemplate = (id: string) => request('GET', `/templates/${id}`, AgentTemplateSchema)
export const listAgentsOfTemplate = (id: string) => request('GET', `/templates/${id}/agents`, z.array(AgentSchema))

// ---- Ghi: Agent Studio (Bước 2) ----
export const postPromptVersion = (agentId: string, prompt: string, note: string) => request('POST', `/agents/${agentId}/prompt-versions`, PromptVersionSchema, { prompt, note })
export const postRestoreVersion = (agentId: string, versionId: string) => request('POST', `/agents/${agentId}/prompt-versions/${versionId}/restore`, PromptVersionSchema)
export const putModelPolicy = (agentId: string, p: ModelPolicyInput) => request('PUT', `/agents/${agentId}/model-policy`, ModelPolicySchema, p)
export const postModelTest = (modelId: string, prompt: string) => request('POST', `/models/${modelId}/test`, ModelTestResultSchema, { prompt })
export type TemplatePart = 'prompt' | 'model'
/** Áp từng phần của bản mẫu mới; `parts` rỗng = bỏ qua bản này. KHÔNG bao giờ tự cấp quyền công cụ. */
export const postTemplateSync = (agentId: string, parts: TemplatePart[]) => request('POST', `/agents/${agentId}/template-sync`, StudioConfigSchema, { parts })
export const postDepartmentHead = (departmentId: string, agentId: string) => request('POST', `/departments/${departmentId}/head`, z.unknown(), { agentId })

// ---- Ghi: công cụ, quyền, bí mật (Bước 3) ----
/** Lưu thay đổi quyền của một agent; trả quyền hiệu lực mới. Lỗi: 400 {message} (phạm vi sai), 403 {reasonCode: ADMIN_FLAG_OFF|TOOL_DISABLED} */
export const putGrants = (agentId: string, change: PermissionChange) => request('PUT', `/agents/${agentId}/grants`, EffectivePermissionsSchema, change)
/** Tắt/bật khẩn cấp toàn hệ thống (`enabled`) hoặc bật/tắt cờ xác nhận của công cụ MONEY/DESTRUCTIVE (`adminFlagOn`) */
export const putTool = (toolId: string, change: { enabled?: boolean; adminFlagOn?: boolean; reason?: string }) => request('PUT', `/tools/${toolId}`, ToolSchema, change)
/** `value` chỉ đi MỘT chiều lên BE; BE không bao giờ trả lại */
export const postSecret = (b: { name: string; kind: string; value: string }) => request('POST', '/secrets', SecretSchema, b)
export const postRotateSecret = (id: string, value: string) => request('POST', `/secrets/${id}/rotate`, SecretSchema, { value })
/** 409 {reasonCode: "IN_USE", usedBy} nếu còn quyền tham chiếu */
export const deleteSecret = (id: string) => request('DELETE', `/secrets/${id}`, z.unknown())

// ---- Ghi: hồ sơ model, luật định tuyến, so sánh (Bước 4) ----
export const listModelPolicies = () => request('GET', '/model-policies', z.array(ModelPolicySchema))
export const postModel = (b: ModelProfileInput) => request('POST', '/models', ModelProfileSchema, b)
export const putModel = (id: string, b: ModelProfileInput) => request('PUT', `/models/${id}`, ModelProfileSchema, b)
export const postModelCheck = (id: string) => request('POST', `/models/${id}/check`, ConnectionCheckSchema)
/** Thay TOÀN BỘ luật theo thứ tự gửi lên (thứ tự = độ ưu tiên) */
export const putRoutingRules = (rules: Pick<RoutingRule, 'id' | 'name' | 'when' | 'modelId'>[]) => request('PUT', '/routing-rules', z.array(RoutingRuleSchema), { rules })
export const postSimulate = (b: { agentId: string; priority: string; tokens: number; dataClass: string }) => request('POST', '/routing/simulate', SimulationSchema, b)
export const postEstimate = (b: { prompt: string; modelIds: string[] }) => request('POST', '/comparisons/estimate', EstimateSchema, b)
export const postRunComparison = (b: { prompt: string; modelIds: string[] }) => request('POST', '/comparisons/run', ComparisonSchema, b)
export const postSaveComparison = (c: Comparison) => request('POST', '/comparisons', ComparisonSchema, c)
export const listComparisons = () => request('GET', '/comparisons', z.array(ComparisonSchema))
