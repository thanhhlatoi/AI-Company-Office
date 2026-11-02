import type { KanbanColumnId } from '../../types/kanban'
import { activity, projectView, snapshots, usage } from './compute'
import { conversationPage, kanbanPage, messagePage, notificationPage } from './lists'
import { allBudgets, changes } from './budgetView'
import { PRICES, projects } from './seed'
import { conversations, notifications } from './seedText'
import { overview } from './stats'
import { foldVi } from '../../lib/text'

const must = <T,>(v: T | undefined, what: string): T => { if (v === undefined) throw new Error(`Mock 404: không có ${what}`); return v }

/** Các route ĐỌC của Prompt 3C (docs/MISSING_API.md mục I). undefined = không phải route của nhóm này. */
export function bizRequest(method: string, fullPath: string): unknown {
  if (method !== 'GET') return undefined
  const [path, qs = ''] = fullPath.split('?')
  const q = new URLSearchParams(qs)
  const seg = path.split('/') // ['', 'projects', id, 'snapshots']
  const range = { from: q.get('from') as string, to: q.get('to') as string }

  if (seg[1] === 'projects') {
    if (!seg[2]) {
      const text = foldVi(q.get('q') ?? '')
      return projects.map(projectView).filter((p) => (!q.get('status') || p.status === q.get('status')) && (!q.get('departmentId') || p.departmentId === q.get('departmentId')) && (!text || foldVi(p.name).includes(text)))
    }
    must(projects.find((p) => p.id === seg[2]), `dự án ${seg[2]}`)
    if (seg[3] === 'snapshots') return snapshots(seg[2])
    if (seg[3] === 'events') return activity(seg[2])
    return projectView(projects.find((p) => p.id === seg[2]) as (typeof projects)[number])
  }
  if (seg[1] === 'kanban' && seg[2] === 'columns') return kanbanPage(seg[3] as KanbanColumnId, q)
  if (path === '/usage') return usage(range, (q.get('groupBy') ?? 'agent') as 'agent', { projectId: q.get('projectId') ?? undefined, agentId: q.get('agentId') ?? undefined })
  if (path === '/model-prices') return PRICES
  if (path === '/budgets') return allBudgets()
  if (seg[1] === 'budgets' && seg[3] === 'changes') return changes.filter((c) => c.budgetId === seg[2])
  if (path === '/conversations') return conversationPage(q)
  if (seg[1] === 'conversations' && seg[2] && !seg[3]) return must(conversations.find((c) => c.id === seg[2]), `hội thoại ${seg[2]}`)
  if (seg[1] === 'conversations' && seg[3] === 'messages') return messagePage(seg[2], q)
  if (path === '/stats/overview') return overview(range, { departmentId: q.get('departmentId') ?? undefined, projectId: q.get('projectId') ?? undefined })
  if (path === '/notifications/unread-count') return { count: notifications.filter((n) => !n.readAt).length }
  if (path === '/notifications') return notificationPage(q)
  return undefined
}
