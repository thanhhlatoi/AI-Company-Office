import { foldVi } from '../../lib/text'
import type { Task } from '../../types'
import type { KanbanColumnId } from '../../types/kanban'
import { mockDb } from '../db'
import { workTasks } from '../work'
import { deptOf } from './compute'
import { bizTasks, ord } from './seed'
import { conversations, messagesOf, notifications } from './seedText'

/** Cắt một trang theo cursor = vị trí bắt đầu (chuỗi số). */
export function paginate<T>(all: T[], cursor: string | null, limit: number) {
  const at = Number(cursor ?? 0) || 0
  const items = all.slice(at, at + limit)
  return { items, nextCursor: at + limit < all.length ? String(at + limit) : null }
}
const RANK = { HIGH: 0, NORMAL: 1, LOW: 2 }
const COLUMN: Record<KanbanColumnId, Task['status'][]> = { QUEUED: ['QUEUED', 'WAITING_BUDGET'], RUNNING: ['RUNNING'], AWAITING_APPROVAL: ['AWAITING_APPROVAL'], DONE: ['DONE'], FAILED_CANCELLED: ['FAILED', 'CANCELLED'] }
export const allTasks = () => [...workTasks(), ...bizTasks]

export function kanbanPage(col: KanbanColumnId, q: URLSearchParams) {
  const text = foldVi(q.get('q') ?? '')
  let list = allTasks().filter((t) => COLUMN[col].includes(t.status)
    && (!q.get('projectId') || t.projectId === q.get('projectId')) && (!q.get('agentId') || t.agentId === q.get('agentId'))
    && (!q.get('departmentId') || deptOf(t.agentId) === q.get('departmentId')) && (!q.get('priority') || t.priority === q.get('priority'))
    && (!text || foldVi(t.title).includes(text)))
  // "Chờ" xếp theo thứ tự SẼ chạy (ưu tiên, rồi ai vào trước); các cột khác mới cập nhật trước
  list = col === 'QUEUED' ? list.sort((a, b) => RANK[a.priority] - RANK[b.priority] || ord(a) - ord(b)) : list.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  return { ...paginate(list, q.get('cursor'), Number(q.get('limit') ?? 50)), total: list.length }
}

const hay = (id: string) => { const c = conversations.find((x) => x.id === id)!; return foldVi(`${c.title} ${(messagesOf.get(id) ?? []).map((m) => `${m.content} ${m.toolName ?? ''} ${JSON.stringify(m.toolArgs ?? '')}`).join(' ')}`) }
const count = (h: string, n: string) => (n ? h.split(n).length - 1 : 0)

/** Tìm hội thoại: không dấu, lọc theo agent/phòng/dự án/goal/ngày/vai trò/lỗi/công cụ; sắp theo liên quan hoặc mới nhất. */
export function conversationPage(q: URLSearchParams) {
  const n = foldVi(q.get('q') ?? '').trim()
  const from = q.get('from') ? Date.parse(q.get('from') as string) : 0, to = q.get('to') ? Date.parse(q.get('to') as string) : Infinity
  const rows = conversations.filter((c) => {
    const msgs = messagesOf.get(c.id) ?? []
    return (!n || hay(c.id).includes(n)) && (!q.get('agentId') || c.agentId === q.get('agentId')) && (!q.get('projectId') || c.projectId === q.get('projectId'))
      && (!q.get('goalId') || c.goalId === q.get('goalId')) && (!q.get('taskId') || c.taskId === q.get('taskId')) && (!q.get('departmentId') || deptOf(c.agentId) === q.get('departmentId'))
      && Date.parse(c.startedAt) >= from && Date.parse(c.startedAt) < to && (!q.get('role') || msgs.some((m) => m.role === q.get('role')))
      && (!q.get('hasError') || c.hasError) && (!q.get('tool') || c.tools.includes(q.get('tool') as string))
  })
  rows.sort((a, b) => (q.get('sort') === 'relevance' && n ? count(hay(b.id), n) - count(hay(a.id), n) : 0) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  const withSnippet = rows.map((c) => {
    const m = n ? (messagesOf.get(c.id) ?? []).find((x) => foldVi(x.content).includes(n)) : undefined
    const at = m ? foldVi(m.content).indexOf(n) : -1 // foldVi giữ nguyên độ dài chuỗi, nên vị trí dùng chung được
    return { ...c, snippet: m ? `${at > 50 ? '…' : ''}${m.content.slice(Math.max(0, at - 50), at + n.length + 70).replace(/\s+/g, ' ')}…` : null }
  })
  return paginate(withSnippet, q.get('cursor'), Number(q.get('limit') ?? 30))
}

export const messagePage = (id: string, q: URLSearchParams) => paginate(messagesOf.get(id) ?? [], q.get('cursor'), Number(q.get('limit') ?? 40))

export function notificationPage(q: URLSearchParams) {
  const list = notifications.filter((n) => (!q.get('level') || n.level === q.get('level')) && (!q.get('type') || n.type === q.get('type')) && (!q.get('unread') || !n.readAt))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  return paginate(list, q.get('cursor'), Number(q.get('limit') ?? 30))
}
export const agentName = (id: string) => mockDb.agents.find((a) => a.id === id)?.name ?? id
