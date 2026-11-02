import { useSearchParams } from 'react-router-dom'
import type { KanbanFilters } from '../../api/biz'

export type Group = 'none' | 'agent' | 'project'
/** Bộ lọc của bảng lưu trong URL (chia sẻ link được). `lockProject` = dự án cố định (tab Task của trang dự án). */
export function useBoardFilters(lockProject?: string) {
  const [sp, setSp] = useSearchParams()
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k) }
    setSp(next, { replace: true })
  }
  const group = (['agent', 'project'].includes(sp.get('group') ?? '') ? sp.get('group') : 'none') as Group
  const api: KanbanFilters = {
    agentId: sp.get('agent') ?? undefined, departmentId: sp.get('dept') ?? undefined, projectId: lockProject ?? sp.get('project') ?? undefined,
    priority: sp.get('prio') ?? undefined, q: sp.get('q') ?? undefined,
  }
  return { api, group, taskId: sp.get('task'), failedOpen: sp.get('failed') === '1', get: (k: string) => sp.get(k) ?? '', set }
}
