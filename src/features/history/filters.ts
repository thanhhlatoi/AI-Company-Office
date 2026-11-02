import { useSearchParams } from 'react-router-dom'
import type { HistoryFilters } from '../../api/biz'

const DAY = 86_400_000
/** Bộ lọc lịch sử lưu trong URL (chia sẻ được). `c` = hội thoại đang mở. */
export function useHistoryFilters() {
  const [sp, setSp] = useSearchParams()
  const get = (k: string) => sp.get(k) ?? ''
  const q = get('q')
  const from = get('from'), to = get('to')
  const sort = get('sort') === 'newest' || get('sort') === 'relevance' ? (get('sort') as 'newest' | 'relevance') : q.trim() ? 'relevance' : 'newest'
  const api: HistoryFilters = {
    q: q.trim() || undefined, agentId: get('agent') || undefined, departmentId: get('dept') || undefined, projectId: get('project') || undefined, goalId: get('goal') || undefined, taskId: get('task') || undefined,
    from: from ? new Date(`${from}T00:00:00+07:00`).toISOString() : undefined, to: to ? new Date(Date.parse(`${to}T00:00:00+07:00`) + DAY).toISOString() : undefined, // gồm cả ngày cuối (giờ VN)
    role: get('role') || undefined, hasError: get('error') === '1' || undefined, tool: get('tool') || undefined, sort,
  }
  const set = (patch: Record<string, string | null>, replace = true) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k) }
    setSp(next, { replace })
  }
  const active = ['q', 'agent', 'dept', 'project', 'goal', 'task', 'from', 'to', 'role', 'error', 'tool'].some((k) => sp.get(k))
  return { api, q, sort, selected: sp.get('c'), get, set, active, clear: () => setSp(sp.get('c') ? { c: sp.get('c') as string } : {}, { replace: true }) }
}
