import { ApiError } from '../../api/http'
import type { Task } from '../../types'
import type { KanbanColumnId, MoveReason, MoveRequest } from '../../types/kanban'
import { mockDb, mockTask, newId } from '../db'
import { depsDone, publishEvent, setAgent, taskOf, touchTask } from '../work'
import { allTasks } from './lists'
import { bizTasks, orderKey, ord } from './seed'

// BE giả quyết định việc kéo thả (FE chỉ gợi ý). Từ chối = HTTP 409 {reasonCode}.
const RANK = { HIGH: 0, NORMAL: 1, LOW: 2 }
const iso = () => new Date().toISOString()
const reject = (reasonCode: MoveReason): never => { throw new ApiError(409, `Mock 409: ${reasonCode}`, { reasonCode }) }
const columnOf = (s: Task['status']): KanbanColumnId =>
  s === 'QUEUED' || s === 'WAITING_BUDGET' ? 'QUEUED' : s === 'RUNNING' ? 'RUNNING' : s === 'AWAITING_APPROVAL' ? 'AWAITING_APPROVAL' : s === 'DONE' ? 'DONE' : 'FAILED_CANCELLED'

function move(t: Task, req: MoveRequest): Task {
  if (t.version !== req.expectedVersion) reject('STALE_VERSION')
  if (t.status === 'AWAITING_APPROVAL' || t.locked) reject('USE_APPROVAL_DIALOG')
  const from = columnOf(t.status)
  switch (req.toColumn) {
    case 'DONE': case 'AWAITING_APPROVAL': return reject('NOT_ALLOWED')
    case 'RUNNING': {
      if (t.status !== 'QUEUED') reject('NOT_ALLOWED')
      if (!depsDone(t)) reject('DEPENDENCIES_PENDING')
      if (mockDb.agents.find((a) => a.id === t.agentId)?.status !== 'IDLE') reject('NOT_ALLOWED') // agent đang bận
      touchTask(t, { status: 'RUNNING', startedAt: iso(), attempts: t.attempts + 1, error: null })
      setAgent(t.agentId, 'WORKING', t)
      return t
    }
    case 'FAILED_CANCELLED': { // thả vào vùng "Huỷ"
      if (t.status === 'FAILED' || t.status === 'CANCELLED') return t
      if (from !== 'QUEUED' && from !== 'RUNNING') reject('NOT_ALLOWED')
      if (t.status === 'RUNNING') setAgent(t.agentId, 'IDLE', null)
      touchTask(t, { status: 'CANCELLED', error: 'Chủ đã huỷ' })
      return t
    }
    case 'QUEUED': {
      if (from === 'RUNNING') reject('NOT_SUPPORTED') // không đưa việc đang chạy về hàng chờ
      if (from === 'DONE' || from === 'FAILED_CANCELLED') { // làm lại = TẠO task mới
        const c = mockTask({ ...t, id: newId(), status: 'QUEUED', result: null, error: null, attempts: 0, startedAt: null, createdAt: iso(), updatedAt: iso(), version: 1, locked: false, costMicro: 0, tokensUsed: 0 })
        bizTasks.push(c)
        publishEvent({ type: 'task.created', task: c })
        return c
      }
      // đổi thứ tự trong hàng chờ: nhận ưu tiên của thẻ đứng ngay dưới; thả cuối cột thì đứng sau thẻ cuối
      const queue = allTasks().filter((x) => (x.status === 'QUEUED' || x.status === 'WAITING_BUDGET') && x.id !== t.id).sort((a, b) => RANK[a.priority] - RANK[b.priority] || ord(a) - ord(b))
      const before = req.beforeTaskId ? taskOf(req.beforeTaskId) : undefined
      const anchor = before ?? queue[queue.length - 1]
      if (anchor) {
        const at = before ? queue.indexOf(before) : -1
        const prev = at > 0 ? queue[at - 1] : undefined
        // chèn vào điểm giữa hai thẻ liền kề (nếu cùng ưu tiên) để luôn có thứ tự duy nhất
        orderKey.set(t.id, before ? (prev && prev.priority === before.priority ? (ord(prev) + ord(before)) / 2 : ord(before) - 1) : ord(anchor) + 1)
      }
      touchTask(t, anchor ? { priority: anchor.priority } : {})
      return t
    }
  }
}

/** POST /tasks/{id}/move, POST /tasks/{id}/assign, GET /tasks/{id}/history. undefined = không phải route này. */
export function taskRequest(method: string, path: string, body: unknown): unknown {
  const m = path.match(/^\/tasks\/([^/]+)\/(move|assign|history)$/)
  if (!m) return undefined
  const t = taskOf(m[1])
  if (!t) throw new ApiError(404, `Mock 404: không có task ${m[1]}`)
  if (m[2] === 'history' && method === 'GET') {
    const out = [{ at: t.createdAt, status: 'QUEUED', note: 'Tạo task' }]
    if (t.startedAt) out.push({ at: t.startedAt, status: 'RUNNING', note: `Bắt đầu (lần ${Math.max(1, t.attempts)})` })
    if (t.status !== 'QUEUED' && t.status !== 'RUNNING') out.push({ at: t.updatedAt, status: t.status, note: t.error ?? '' })
    return out
  }
  if (method !== 'POST') return undefined
  if (m[2] === 'assign') { touchTask(t, { agentId: (body as { agentId: string }).agentId }); return t }
  return move(t, body as MoveRequest)
}
