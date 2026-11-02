// Logic thuần của Mẫu agent: xuất / nhập an toàn, tham số hoá prompt, gợi ý model, tóm tắt quyền. Chạy được bằng `node --test`.
import { AgentTemplateInputSchema, type AgentTemplate, type AgentTemplateInput } from '../../types/studio.ts'
import type { ModelProfile } from '../../types/models.ts'

export const MAX_IMPORT_BYTES = 200 * 1024

/** JSON để xuất: bỏ id, loại, ngày, khoá (BE cấp lại khi nhập) */
export const toExport = (t: AgentTemplate): AgentTemplateInput => ({
  name: t.name, group: t.group, description: t.description, systemPrompt: t.systemPrompt, promptNotes: t.promptNotes, variables: t.variables,
  suggestedTools: t.suggestedTools.map((s) => ({ toolId: s.toolId, scope: s.scope })), modelRequirement: { preferLocal: t.modelRequirement.preferLocal, needsToolUse: t.modelRequirement.needsToolUse, minTier: t.modelRequirement.minTier ?? null },
})

/** Đọc tệp mẫu do người khác gửi: KHÔNG tin cậy. Trả lỗi tiếng Việt thay vì ném. Trường lạ bị bỏ. */
export function parseImport(text: string): { ok: true; template: AgentTemplateInput } | { ok: false; error: string } {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: `Tệp quá lớn (tối đa ${MAX_IMPORT_BYTES / 1024} KB)` }
  let json: unknown
  try { json = JSON.parse(text) } catch { return { ok: false, error: 'Tệp không phải JSON hợp lệ' } }
  const p = AgentTemplateInputSchema.safeParse(json)
  return p.success ? { ok: true, template: { ...p.data, group: 'Đã nhập' } } : { ok: false, error: `${p.error.issues[0].path.join('.') || 'Tệp'}: ${p.error.issues[0].message}` }
}

/** Thay mọi chỗ xuất hiện của chuỗi `find` bằng {{key}} (tham số hoá khi lưu thành mẫu). Bỏ qua dòng trống / khoá sai. */
export function applyVariables(prompt: string, reps: { find: string; key: string }[]): string {
  let out = prompt
  for (const r of reps) if (r.find.trim() && /^[A-Za-z][\w-]*$/.test(r.key)) out = out.split(r.find).join(`{{${r.key}}}`)
  return out
}

const TIER = { FAST: 0, BALANCED: 1, POWER: 2 } as const
export interface ModelFit { model: ModelProfile; fit: boolean; note: string }
/** Xếp model theo yêu cầu của mẫu: phù hợp trước (local trước nếu mẫu ưu tiên local), kèm lý do với model không phù hợp. */
export function recommendModels(req: AgentTemplate['modelRequirement'], models: ModelProfile[]): ModelFit[] {
  const fits = models.map((model): ModelFit => {
    if (model.health.status === 'DOWN') return { model, fit: false, note: 'Đang ngừng hoạt động' }
    if (req.needsToolUse && !model.capabilities.toolUse) return { model, fit: false, note: 'Không hỗ trợ dùng công cụ' }
    if (req.minTier && TIER[model.tier] < TIER[req.minTier]) return { model, fit: false, note: 'Tier thấp hơn yêu cầu của mẫu' }
    return { model, fit: true, note: req.preferLocal ? (model.dataClass === 'LOCAL' ? 'LOCAL: đúng ưu tiên của mẫu' : 'CLOUD: mẫu ưu tiên local') : 'Phù hợp' }
  })
  const PREF = { BALANCED: 0, FAST: 1, POWER: 2 } // mặc định chọn tier cân bằng, không tự đẩy lên model đắt nhất
  return fits.sort((a, b) => Number(b.fit) - Number(a.fit) || (req.preferLocal ? Number(b.model.dataClass === 'LOCAL') - Number(a.model.dataClass === 'LOCAL') : 0) || PREF[a.model.tier] - PREF[b.model.tier])
}
