import { ProjectInputSchema, type Project } from '../../types/project'
import { publishEvent } from '../work'
import { projectView } from './compute'
import { NOW, projects } from './seed'

/** Ghi dự án: tạo mới, lưu trữ / mở lại. undefined = không phải route của nhóm này. */
export function projectRequest(method: string, path: string, body: unknown): unknown {
  if (method !== 'POST') return undefined
  const emit = (p: Project) => { const v = projectView(p); publishEvent({ type: 'project.updated', project: v }); return v }
  if (path === '/projects') {
    const input = ProjectInputSchema.parse(body)
    const p: Project = {
      ...input, id: `p${projects.length + 1}`, departmentId: input.departmentId ?? null, status: 'ACTIVE', costMicro: 0, progressPct: 0, goalIds: [], createdAt: new Date(NOW).toISOString(),
      counts: { queued: 0, running: 0, awaitingApproval: 0, waitingBudget: 0, done: 0, failed: 0, cancelled: 0 },
    }
    projects.push(p)
    return emit(p)
  }
  const m = path.match(/^\/projects\/([^/]+)\/(archive|reopen)$/)
  const p = m && projects.find((x) => x.id === m[1])
  if (!m || !p) return undefined
  p.status = m[2] === 'archive' ? 'ARCHIVED' : 'ACTIVE'
  return emit(p)
}
