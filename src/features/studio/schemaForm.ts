// Tập con JSON Schema đủ để dựng biểu mẫu PHẠM VI công cụ (xem docs/BE_API_SPEC_PART3.md). Không import gì: chạy được bằng `node --test`.
export type FieldKind = 'string' | 'enum' | 'secret' | 'integer' | 'number' | 'boolean' | 'list' | 'json'
export interface Field {
  key: string; title: string; kind: FieldKind; required: boolean; def: unknown
  options?: string[]; secretKind?: string; min?: number; max?: number; description?: string
}
type Prop = { type?: string; title?: string; description?: string; default?: unknown; enum?: unknown[]; items?: { type?: string }; minimum?: number; maximum?: number; 'x-secretKind'?: string }

/** Danh sách trường theo thứ tự khai báo. Kiểu lạ (object lồng, oneOf...) -> 'json': chỉ đọc, không cho sửa. */
export function fieldsOf(schema: Record<string, unknown>): Field[] {
  const props = (schema.properties ?? {}) as Record<string, Prop>
  const required = new Set((schema.required ?? []) as string[])
  return Object.entries(props).map(([key, p]) => {
    const base = { key, title: p.title ?? key, required: required.has(key), description: p.description, min: p.minimum, max: p.maximum, def: p.default }
    if (p['x-secretKind']) return { ...base, kind: 'secret' as const, secretKind: p['x-secretKind'] }
    if (p.enum) return { ...base, kind: 'enum' as const, options: p.enum.map(String) }
    if (p.type === 'string') return { ...base, kind: 'string' as const }
    if (p.type === 'integer' || p.type === 'number') return { ...base, kind: p.type }
    if (p.type === 'boolean') return { ...base, kind: 'boolean' as const }
    if (p.type === 'array' && p.items?.type === 'string') return { ...base, kind: 'list' as const }
    return { ...base, kind: 'json' as const }
  })
}

/** Giá trị mặc định THẬN TRỌNG: lấy `default` của schema; trường chưa có default thì để trống (người dùng phải điền, không tự mở rộng). */
export function defaultScope(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fieldsOf(schema)) if (f.def !== undefined) out[f.key] = f.def
  return out
}

const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
/** Lỗi theo trường (tiếng Việt); rỗng = hợp lệ. BE vẫn kiểm lại. */
export function validateScope(schema: Record<string, unknown>, scope: Record<string, unknown>): Record<string, string> {
  const errs: Record<string, string> = {}
  for (const f of fieldsOf(schema)) {
    const v = scope[f.key]
    if (f.required && empty(v)) { errs[f.key] = f.kind === 'list' ? 'Cần ít nhất một mục' : 'Bắt buộc'; continue }
    if ((f.kind === 'integer' || f.kind === 'number') && v !== undefined && v !== '') {
      const n = Number(v)
      if (!Number.isFinite(n)) errs[f.key] = 'Phải là số'
      else if (f.kind === 'integer' && !Number.isInteger(n)) errs[f.key] = 'Phải là số nguyên'
      else if (f.min != null && n < f.min) errs[f.key] = `Tối thiểu ${f.min}`
      else if (f.max != null && n > f.max) errs[f.key] = `Tối đa ${f.max}`
    }
  }
  return errs
}
