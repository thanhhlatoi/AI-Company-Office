// Logic thuần của trình hướng dẫn "Tạo agent từ mẫu". Chạy được bằng `node --test` (import có đuôi .ts).
import { defaultScope, validateScope } from '../studio/schemaForm.ts'
import { missingVariables } from '../studio/template.ts'
import { usdToMicro } from '../../lib/money.ts'
import type { Access } from '../../types/knowledge.ts'
import type { ModelPolicyInput } from '../../types/models.ts'
import type { AgentTemplate, InstantiateInput } from '../../types/studio.ts'
import type { Tool } from '../../types/tools.ts'

export interface Pick { on: boolean; scope: Record<string, unknown>; alwaysApprove: boolean }
export interface Draft {
  name: string; role: string; departmentId: string; vars: Record<string, string>
  primaryId: string; fallbackIds: string[]; privacy: ModelPolicyInput['privacy']
  picks: Record<string, Pick>; collections: Record<string, Access>; namespaces: Record<string, Access>
  memory: InstantiateInput['memoryPolicy']; budgetUsd: string
}

/** Khởi tạo: mọi công cụ đề xuất đều TẮT; phạm vi = mặc định thận trọng của công cụ trộn với gợi ý của mẫu. */
export function initDraft(t: AgentTemplate, tools: Tool[], primaryId: string, primaryIsLocal: boolean): Draft {
  const picks: Draft['picks'] = {}
  for (const s of t.suggestedTools) { const tool = tools.find((x) => x.id === s.toolId); picks[s.toolId] = { on: false, scope: { ...(tool ? defaultScope(tool.scopeSchema) : {}), ...(t.kind === 'IMPORTED' ? {} : s.scope) }, alwaysApprove: false } }
  // mẫu ĐÃ NHẬP là dữ liệu không tin cậy: không điền sẵn phạm vi từ nó (xem test)
  return {
    name: '', role: '', departmentId: '', vars: Object.fromEntries(t.variables.map((v) => [v.key, v.default])),
    primaryId, fallbackIds: [], privacy: t.modelRequirement.preferLocal && primaryIsLocal ? 'LOCAL_ONLY' : 'ANY',
    picks, collections: {}, namespaces: {}, memory: { enabled: false, autoLoad: 5, autoSummarize: false, requireReview: true }, budgetUsd: '',
  }
}

export type Problem = { step: 1 | 3; text: string }
/** Mọi vấn đề chặn việc tạo (kèm bước cần quay lại sửa). */
export function problems(d: Draft, t: AgentTemplate, tools: Tool[]): Problem[] {
  const out: Problem[] = []
  if (!d.name.trim()) out.push({ step: 1, text: 'Chưa đặt tên agent' })
  if (!d.role.trim()) out.push({ step: 1, text: 'Chưa nhập vai trò' })
  for (const v of missingVariables(t, d.vars)) out.push({ step: 1, text: `Chưa điền biến bắt buộc “${v.label}”` })
  for (const [id, p] of Object.entries(d.picks)) {
    if (!p.on) continue
    const tool = tools.find((x) => x.id === id)
    if (!tool) { out.push({ step: 3, text: `Công cụ ${id} không còn tồn tại` }); continue }
    if (!tool.enabled || (tool.requiresAdminFlag && !tool.adminFlagOn)) out.push({ step: 3, text: `“${tool.name}” đang bị khoá, bỏ tick hoặc mở khoá ở trang Công cụ` })
    const errs = Object.keys(validateScope(tool.scopeSchema, p.scope)).length
    if (errs) out.push({ step: 3, text: `Phạm vi “${tool.name}” còn ${errs} trường chưa hợp lệ` })
  }
  const usd = d.budgetUsd.trim()
  if (usd && !(Number(usd) > 0)) out.push({ step: 1, text: 'Ngân sách ngày phải là số lớn hơn 0' })
  return out
}

/** Chỉ gửi công cụ ĐÃ TICK và quyền dữ liệu khác "Không". */
export function toInstantiate(d: Draft): InstantiateInput {
  const keep = (m: Record<string, Access>) => Object.entries(m).filter(([, a]) => a !== 'NONE')
  return {
    name: d.name.trim(), role: d.role.trim(), departmentId: d.departmentId || null, variables: d.vars,
    model: { primaryId: d.primaryId, fallbackIds: d.fallbackIds, escalationId: null, routing: 'FIXED', privacy: d.privacy },
    grants: Object.entries(d.picks).filter(([, p]) => p.on).map(([toolId, p]) => ({ toolId, scope: p.scope, limits: { maxCallsPerTask: 20, maxPerMinute: null, expiresAt: null }, alwaysApprove: p.alwaysApprove, secretId: null })),
    collections: keep(d.collections).map(([collectionId, access]) => ({ collectionId, access })),
    namespaces: keep(d.namespaces).map(([namespaceId, access]) => ({ namespaceId, access })),
    memoryPolicy: d.memory, dailyBudgetMicro: d.budgetUsd.trim() ? usdToMicro(Number(d.budgetUsd)) : null,
  }
}
