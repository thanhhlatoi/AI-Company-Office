import type { UsageSummary } from '../../types/cost'

export interface StackSeries { key: string; label: string }
/** Gom theo nhóm: `top` nhóm chi phí cao nhất thành từng chuỗi, phần còn lại gộp thành "Khác" (key 'other'). */
export function stackSeries(u: UsageSummary, top = 5) {
  const head = u.rows.slice(0, top)
  const keys = head.map((r) => r.key)
  const series: StackSeries[] = [...head.map((r) => ({ key: r.key, label: r.label })), ...(u.rows.length > top ? [{ key: 'other', label: 'Khác' }] : [])]
  const data = u.byDay.map((d) => ({
    day: d.day,
    ...Object.fromEntries(keys.map((k) => [k, d.parts[k] ?? 0])),
    other: Object.entries(d.parts).filter(([k]) => !keys.includes(k)).reduce((s, [, v]) => s + v, 0),
  }))
  return { series, data }
}
