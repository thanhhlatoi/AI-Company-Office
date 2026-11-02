type Param = string | number | boolean | null | undefined

/** Chuỗi query từ object; bỏ giá trị rỗng. `{a: 1, b: undefined}` -> "?a=1" */
export function qs(params: Record<string, Param>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) u.set(k, String(v))
  const s = u.toString()
  return s ? `?${s}` : ''
}
