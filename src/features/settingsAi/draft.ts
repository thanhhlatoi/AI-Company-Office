import { FIXED_ALIASES, type ReasoningEffort, type SettingsAi, type SettingsAiPatch } from '../../types/settingsAi.ts'
import { checkBaseUrl, intInRange } from './validate.ts'

// Nháp ở FE; giá trị gốc ở server. Khoá dạng 'nhóm.trường' khớp thẳng cấu trúc PUT. Thêm trường = thêm một dòng ở Draft, LABELS, draftFrom, validateDraft.
/** Một dòng bảng định tuyến; 3 dòng đầu luôn là alias cố định (có thể để trống = không đặt). */
export interface AliasRow { key: string; value: string }

export interface Draft {
  'llm.provider': 'fake' | 'local'
  'llm.reasoningEffort': ReasoningEffort
  'llm.timeoutSec': number
  'llm.viaOmniroute': boolean
  'llm.maxOutputTokens': number
  'ollama.baseUrl': string
  'ollama.defaultModel': string
  'omniroute.baseUrl': string
  'llm.modelAliases': AliasRow[]
  'hermes.enabled': boolean
  'hermes.planner': 'hermes' | 'llm'
  'hermes.baseUrl': string
}
export type Key = keyof Draft

export const LABELS: Record<Key, string> = {
  'llm.provider': 'Chế độ AI',
  'llm.reasoningEffort': 'Mức suy luận',
  'llm.timeoutSec': 'Thời gian chờ',
  'llm.viaOmniroute': 'Dùng OmniRoute',
  'llm.maxOutputTokens': 'Token tối đa',
  'ollama.baseUrl': 'Địa chỉ Ollama',
  'ollama.defaultModel': 'Model mặc định',
  'omniroute.baseUrl': 'Địa chỉ OmniRoute',
  'llm.modelAliases': 'Định tuyến theo độ khó',
  'hermes.enabled': 'Bật Hermes',
  'hermes.planner': 'Bên lập kế hoạch',
  'hermes.baseUrl': 'Địa chỉ Hermes',
}

const aliasRows = (m: SettingsAi['llm']['modelAliases']): AliasRow[] => [
  ...FIXED_ALIASES.map((key) => ({ key: key as string, value: m[key] ?? '' })),
  ...Object.entries(m).filter(([k, v]) => v !== undefined && !(FIXED_ALIASES as readonly string[]).includes(k)).map(([key, value]) => ({ key, value: value as string })),
]

export const draftFrom = (s: SettingsAi): Draft => ({
  'llm.provider': s.llm.provider,
  'llm.reasoningEffort': s.llm.reasoningEffort,
  'llm.timeoutSec': s.llm.timeoutSec,
  'llm.viaOmniroute': s.llm.viaOmniroute,
  'llm.maxOutputTokens': s.llm.maxOutputTokens,
  'ollama.baseUrl': s.ollama.baseUrl,
  'ollama.defaultModel': s.ollama.defaultModel,
  'omniroute.baseUrl': s.omniroute.baseUrl,
  'llm.modelAliases': aliasRows(s.llm.modelAliases),
  'hermes.enabled': s.hermes.enabled,
  'hermes.planner': s.hermes.planner,
  'hermes.baseUrl': s.hermes.baseUrl,
})

/** Các khoá đã sửa thật (sửa rồi gõ lại như cũ thì không tính). */
const same = (a: unknown, b: unknown) => a === b || (typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b))
export const changedKeys = (base: Draft, edits: Partial<Draft>): Key[] => (Object.keys(edits) as Key[]).filter((k) => !same(edits[k], base[k]))

/** Lỗi theo từng dòng (undefined = ổn). Tên: không rỗng, ký tự hợp lệ, không trùng. Giá trị: bắt buộc với dòng tuỳ chỉnh. */
export function aliasErrors(rows: AliasRow[]): (string | undefined)[] {
  const count = new Map<string, number>()
  return rows.map((r, i) => {
    const key = r.key.trim()
    if (!key) return 'Tên alias không được để trống'
    if (!/^[\w.-]+$/.test(key)) return 'Tên chỉ gồm chữ, số, dấu chấm, gạch ngang, gạch dưới'
    const n = (count.get(key) ?? 0) + 1
    count.set(key, n)
    if (n > 1) return 'Tên alias bị trùng'
    if (i >= FIXED_ALIASES.length && !r.value.trim()) return 'Hãy chọn combo/model'
    return undefined
  })
}

/** Bảng -> object gửi BE (thay thế toàn bộ modelAliases). Dòng cố định để trống thì bỏ qua. */
export const aliasesToRecord = (rows: AliasRow[]): Record<string, string> =>
  Object.fromEntries(rows.filter((r) => r.value.trim()).map((r) => [r.key.trim(), r.value.trim()]))

/** PUT từng phần: chỉ gửi trường đã đổi; không có khoá bí mật nào ở đây. */
export function toPatch(keys: Key[], d: Draft): SettingsAiPatch {
  const p: Record<string, Record<string, unknown>> = {}
  for (const k of keys) { const [g, n] = k.split('.'); (p[g] ??= {})[n] = k === 'llm.modelAliases' ? aliasesToRecord(d[k]) : d[k] }
  // Hai cờ bật OmniRoute (llm.viaOmniroute và omniroute.enabled) luôn đi cùng nhau
  if (keys.includes('llm.viaOmniroute')) (p.omniroute ??= {}).enabled = d['llm.viaOmniroute']
  return p as SettingsAiPatch
}

export function validateDraft(d: Draft): Partial<Record<Key, string>> {
  const e: Partial<Record<Key, string>> = {}
  const url = checkBaseUrl(d['ollama.baseUrl'])
  if (url.error) e['ollama.baseUrl'] = url.error
  if (d['llm.viaOmniroute']) { const o = checkBaseUrl(d['omniroute.baseUrl']); if (o.error) e['omniroute.baseUrl'] = o.error }
  if (!d['ollama.defaultModel'].trim()) e['ollama.defaultModel'] = 'Hãy chọn hoặc nhập tên model'
  if (d['hermes.enabled']) { const h = checkBaseUrl(d['hermes.baseUrl']); if (h.error) e['hermes.baseUrl'] = h.error }
  if (aliasErrors(d['llm.modelAliases']).some(Boolean)) e['llm.modelAliases'] = 'Còn dòng lỗi trong bảng định tuyến'
  if (!intInRange(d['llm.timeoutSec'], 1, 3600)) e['llm.timeoutSec'] = 'Số nguyên từ 1 đến 3600 giây'
  if (!intInRange(d['llm.maxOutputTokens'], 1, 200_000)) e['llm.maxOutputTokens'] = 'Số nguyên từ 1 đến 200000'
  return e
}

/** Hậu quả cần nói rõ trước khi lưu; rỗng = không cần hộp xác nhận. */
export function confirmNotes(base: Draft, keys: Key[], d: Draft): string[] {
  const notes: string[] = []
  if (keys.includes('llm.provider')) notes.push(d['llm.provider'] === 'local' ? 'Agent sẽ gọi AI thật và tính token.' : 'Agent sẽ trả lời mẫu, không gọi AI thật.')
  if (keys.includes('ollama.baseUrl')) notes.push(`Địa chỉ Ollama đổi từ ${base['ollama.baseUrl']} sang ${d['ollama.baseUrl'].trim()}. Nếu sai, agent sẽ báo lỗi LLM_UNAVAILABLE.`)
  if (keys.includes('omniroute.baseUrl')) notes.push(`Địa chỉ OmniRoute đổi từ ${base['omniroute.baseUrl']} sang ${d['omniroute.baseUrl'].trim()}. Nếu sai, agent sẽ báo lỗi LLM_UNAVAILABLE.`)
  if (keys.includes('hermes.baseUrl')) notes.push(`Địa chỉ Hermes đổi từ ${base['hermes.baseUrl']} sang ${d['hermes.baseUrl'].trim()}. Nếu sai, BE không lập kế hoạch và đồng bộ bot được.`)
  if (keys.includes('hermes.planner')) notes.push(d['hermes.planner'] === 'hermes' ? 'Việc lập kế hoạch cho mục tiêu sẽ do Hermes làm.' : 'Việc lập kế hoạch cho mục tiêu sẽ do LLM thường làm, không qua Hermes.')
  return notes
}
