import type { Task, RealtimeMessage } from '../../types'
import type { Notification } from '../../types/notify'
import { projectView } from './compute'
import { mockDb } from '../db'
import { budgetView } from './budgetView'
import { R, bizTasks, budgets, calls, projects } from './seed'
import { notifications } from './seedText'

type Publish = (m: RealtimeMessage) => void
const iso = () => new Date().toISOString()
const RANK = { HIGH: 0, NORMAL: 1, LOW: 2 }
let notifySeq = 1000

/**
 * Mô phỏng realtime của Prompt 3C (phát qua cùng đường sự kiện có id):
 * - task chuyển cột: Chờ -> Đang làm -> Xong (thỉnh thoảng Lỗi), kéo theo project.updated và stats.invalidated
 * - notification.created, thỉnh thoảng 3 lần liên tiếp cùng loại + cùng đối tượng (để thử gộp "x3")
 * - ngân sách phòng Studio YouTube: ngưỡng mềm (~35s) rồi ngưỡng cứng (~80s)
 */
export function startBizLive(publish: Publish): () => void {
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let stopped = false
  const later = (fn: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); if (!stopped) fn() }, ms); timers.add(t) }

  const touch = (t: Task, patch: Partial<Task>) => {
    Object.assign(t, patch, { updatedAt: iso(), version: t.version + 1 })
    publish({ type: 'task.updated', task: t })
    const p = projects.find((x) => x.id === t.projectId)
    if (p) publish({ type: 'project.updated', project: projectView(p) })
  }
  const notify = (level: Notification['level'], type: string, title: string, target: Notification['target'], body = '') => {
    const n: Notification = { id: String(++notifySeq), level, type, title, body, target, createdAt: iso(), readAt: null }
    notifications.unshift(n)
    publish({ type: 'notification.created', notification: n })
  }

  // task chuyển cột mỗi ~9 giây
  const advance = () => {
    const running = bizTasks.find((t) => t.status === 'RUNNING')
    if (running) {
      const fail = R.next() < 0.15
      if (!fail) { const cost = R.int(2000, 40000); running.costMicro += cost; calls.push({ at: Date.now(), agentId: running.agentId, model: 'claude-sonnet-5-5', inTok: 1500, outTok: 600, costMicro: cost, taskId: running.id, projectId: running.projectId ?? null }) }
      touch(running, fail ? { status: 'FAILED', error: 'Hết thời gian chờ API', attempts: running.attempts + 1 } : { status: 'DONE', result: '## Kết quả\n\nĐã xong.' })
      publish({ type: 'stats.invalidated' })
      if (fail) notify('WARNING', 'task.failed', `Task lỗi: ${running.title}`, { kind: 'TASK', id: running.id })
    } else {
      const next = bizTasks.filter((t) => t.status === 'QUEUED').sort((a, b) => RANK[a.priority] - RANK[b.priority] || Date.parse(a.createdAt) - Date.parse(b.createdAt))[0]
      if (next) touch(next, { status: 'RUNNING', startedAt: iso(), attempts: 1 })
    }
    later(advance, 9000)
  }
  later(advance, 6000)

  // thông báo mới mỗi ~25 giây; mỗi lần thứ 3 phát 3 thông báo giống nhau liên tiếp
  let n = 0
  const tick = () => {
    n++
    if (n % 3 === 0) for (let i = 0; i < 3; i++) later(() => notify('WARNING', 'task.failed', 'Task lỗi: Dịch phụ đề', { kind: 'TASK', id: '5003' }, 'Lỗi 429: quá giới hạn tốc độ'), i * 800)
    else notify(R.pick(['INFO', 'SUCCESS'] as const), 'task.done', `Task xong #${R.int(100, 999)}`, { kind: 'TASK', id: String(5000 + R.int(1, 200)) })
    later(tick, 25_000)
  }
  later(tick, 15_000)

  // ngân sách phòng đạt ngưỡng mềm rồi cứng: thêm cuộc gọi thật nên chi phí và ngân sách luôn nhất quán
  const dept = budgets.find((b) => b.id === 'b4')
  if (dept) {
    const topUp = (ratio: number) => {
      const v = budgetView(dept)
      const need = Math.max(1000, Math.round(v.limitMicro * ratio - v.usedMicro - v.reservedMicro))
      const agent = mockDb.agents.find((a) => a.departmentId === dept.scopeId && !a.isHead)
      if (agent) calls.push({ at: Date.now(), agentId: agent.id, model: 'claude-sonnet-5-5', inTok: 1000, outTok: 500, costMicro: need, taskId: '5000', projectId: 'p1' })
      publish({ type: 'budget.updated', budget: budgetView(dept) })
      publish({ type: 'stats.invalidated' })
    }
    later(() => { topUp(0.85); notify('WARNING', 'budget.soft', `${dept.scopeLabel} đạt 85% ngân sách ngày`, { kind: 'BUDGET', id: dept.id }) }, 35_000)
    later(() => {
      topUp(1.02)
      notify('CRITICAL', 'budget.hard', `${dept.scopeLabel} hết ngân sách ngày`, { kind: 'BUDGET', id: dept.id }, 'Việc mới của phòng sẽ chờ ngân sách.')
      const t = bizTasks.find((x) => x.status === 'QUEUED' && x.projectId === 'p1')
      if (t) touch(t, { status: 'WAITING_BUDGET' })
    }, 80_000)
  }
  return () => { stopped = true; timers.forEach(clearTimeout); timers.clear() }
}
