import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { customRange, presetRange, type RangeKind } from '../../lib/range'
import type { UsageGroupBy } from '../../types/cost'

export const GROUP_LABEL: Record<UsageGroupBy, string> = { agent: 'Agent', department: 'Phòng ban', project: 'Dự án', model: 'Model' }
const KINDS: RangeKind[] = ['today', '7d', '30d', 'month', 'custom']
const GROUPS: UsageGroupBy[] = ['agent', 'department', 'project', 'model']

/** Khoảng thời gian + nhóm theo, lưu trong URL (?range=7d&by=model, tuỳ chọn: &from=2026-10-01&to=2026-10-15). */
export function useCostFilters() {
  const [sp, setSp] = useSearchParams()
  const k = sp.get('range') as RangeKind
  const kind: RangeKind = KINDS.includes(k) ? k : '30d'
  const from = sp.get('from') ?? '', to = sp.get('to') ?? ''
  const range = useMemo(() => (kind === 'custom' ? customRange(from, to) : null) ?? presetRange(kind === 'custom' ? '30d' : kind), [kind, from, to])
  const g = sp.get('by') as UsageGroupBy
  const by: UsageGroupBy = GROUPS.includes(g) ? g : 'agent'
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp)
    for (const [key, v] of Object.entries(patch)) { if (v) next.set(key, v); else next.delete(key) }
    setSp(next, { replace: true })
  }
  return { kind, from, to, range, by, invalidCustom: kind === 'custom' && !customRange(from, to), set }
}
