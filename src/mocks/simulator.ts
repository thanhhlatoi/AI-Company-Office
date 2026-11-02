import { mockDb, mockTask, newId } from './db'
import { startDeviceSimulator } from './devices'
import { isPaused, startWorkEngine } from './work'
import type { RealtimeMessage, Task } from '../types'

const TASK_TITLES = ['Đối soát công nợ', 'Lập báo cáo tuần', 'Dự báo nhu cầu Q4', 'Duyệt đơn mua hàng', 'Cập nhật pipeline']
const rand = (min: number, max: number) => min + Math.random() * (max - min)
const now = () => new Date().toISOString()

const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v)

/**
 * Cứ 2–5s chọn ngẫu nhiên 1 agent IDLE -> WORKING, 4–8s sau -> IDLE.
 * Cứ 12–20s một trưởng phòng "chia việc": phát department.dispatch rồi 1.5s sau 2–3 nhân viên bắt đầu làm.
 * Phát message y hệt BE thật qua `emit`. Trả về hàm dừng.
 */
export function startSimulator(emit: (m: RealtimeMessage) => void, onReconnect: () => void = () => {}): () => void {
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let stopped = false
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => { timers.delete(t); if (!stopped) fn() }, ms)
    timers.add(t)
  }
  const log = (agentId: string, message: string) => {
    const event = { id: newId(), agentId, message, createdAt: now() }
    mockDb.events.push(event)
    emit({ type: 'event.created', event })
  }
  const setStatus = (id: string, status: 'IDLE' | 'WORKING' | 'BLOCKED', task: Task | null) => {
    const a = mockDb.agents.find((x) => x.id === id)
    if (!a) return
    a.status = status
    a.currentTask = task && { id: task.id, title: task.title }
    emit({ type: 'agent.status_changed', agentId: id, status, currentTask: a.currentTask })
  }

  /** Cũng dùng cho mockApi khi người dùng giao task: chạy task rồi trả agent về IDLE. */
  const run = (task: Task) => {
    emit({ type: 'task.created', task })
    later(() => {
      task.status = 'RUNNING'; task.updatedAt = now()
      setStatus(task.agentId, 'WORKING', task)
      log(task.agentId, `Bắt đầu: ${task.title}`)
      emit({ type: 'task.updated', task: { ...task } })
      later(() => {
        task.status = 'DONE'; task.updatedAt = now()
        task.result = `## Kết quả\n\nĐã hoàn thành **${task.title}**.\n\n- Mục 1\n- Mục 2`
        setStatus(task.agentId, 'IDLE', null)
        log(task.agentId, `Hoàn thành: ${task.title}`)
        emit({ type: 'task.updated', task: { ...task } })
      }, rand(4000, 8000))
    }, 300)
  }
  simulatorRun = run
  // Người dùng giao mục tiêu cho phòng: trưởng phòng "chia việc" (đường nối chạy), 1.5s sau các nhân viên bắt đầu làm
  simulatorGoal = (departmentId, tasks) => {
    const head = mockDb.departments.find((d) => d.id === departmentId)?.headAgentId
    if (!head) return
    emit({ type: 'department.dispatch', departmentId, headId: head, targetAgentIds: tasks.map((t) => t.agentId) })
    log(head, `Nhận mục tiêu, chia việc cho ${tasks.length} người`)
    for (const t of tasks) later(() => run(t), 1500)
  }

  const startTask = (agent: { id: string }, title = TASK_TITLES[Math.floor(Math.random() * TASK_TITLES.length)]) => {
    if (isPaused()) return // "Dừng tất cả": không bắt đầu việc mới
    const task = mockTask({ id: newId(), agentId: agent.id, title, input: '', status: 'QUEUED', result: null, createdAt: now(), updatedAt: now() })
    mockDb.tasks.push(task)
    run(task)
  }

  const tick = () => {
    const idle = mockDb.agents.filter((a) => a.status === 'IDLE')
    if (idle.length) startTask(idle[Math.floor(Math.random() * idle.length)])
    later(tick, rand(2000, 5000))
  }

  const dispatchTick = () => {
    const d = mockDb.departments[Math.floor(Math.random() * mockDb.departments.length)]
    const staff = d ? mockDb.agents.filter((a) => a.departmentId === d.id && !a.isHead && a.status === 'IDLE') : []
    if (d?.headAgentId && staff.length) {
      const targets = shuffle(staff).slice(0, 2 + Math.floor(Math.random() * 2))
      emit({ type: 'department.dispatch', departmentId: d.id, headId: d.headAgentId, targetAgentIds: targets.map((t) => t.id) })
      log(d.headAgentId, `Chia việc cho ${targets.map((t) => t.name).join(', ')}`)
      // đường nối chạy trước, nhân viên mới bắt đầu làm sau đó
      for (const t of targets) later(() => { if (t.status === 'IDLE') startTask(t) }, 1500)
    }
    later(dispatchTick, rand(12000, 20000))
  }
  later(dispatchTick, rand(4000, 8000))

  // Mỗi 6-12s một sự kiện ngẫu nhiên trong 4 loại làm nhân vật đi lại (giao việc / báo cáo / xin duyệt / họp)
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
  const MESSAGES = ['Mua giúp mình 20 cuốn sách', 'Gửi bạn bản nháp tuần này', 'Nhờ bạn kiểm tra số liệu giúp', 'Bạn xem phần này nhé', 'Cần xử lý gấp việc này']
  let meetingOn = false
  const motionTick = () => {
    const r = Math.random()
    const staff = mockDb.agents.filter((a) => !a.isHead && a.departmentId)
    if (r < 0.45) { // giao việc: 70% cùng phòng, 30% khác phòng
      const from = pick(staff)
      const sameDept = Math.random() < 0.7
      const to = pick(mockDb.agents.filter((a) => a.id !== from.id && (sameDept ? a.departmentId === from.departmentId : a.departmentId !== from.departmentId)))
      if (to) {
        const message = pick(MESSAGES)
        const task = mockTask({ id: newId(), agentId: to.id, title: message, input: message, status: 'QUEUED', result: null, createdAt: now(), updatedAt: now() })
        mockDb.tasks.push(task)
        emit({ type: 'task.handoff', fromAgentId: from.id, toAgentId: to.id, taskId: task.id, message })
        log(from.id, `Giao việc cho ${to.name}: ${message}`)
        later(() => { if (to.status === 'IDLE') run(task) }, 4000) // BE đổi trạng thái người nhận khi họ nhận việc
      }
    } else if (r < 0.65) { // báo cáo trưởng phòng
      const a = pick(staff)
      emit({ type: 'report.to_head', agentId: a.id, departmentId: a.departmentId as string, taskId: mockDb.tasks.findLast((t) => t.agentId === a.id)?.id ?? null })
      log(a.id, 'Báo cáo trưởng phòng')
    } else if (r < 0.8) { // xin duyệt (tối đa 3 yêu cầu cùng lúc)
      const a = pick(mockDb.agents.filter((x) => x.status === 'IDLE' && !mockDb.approvals.some((p) => p.agentId === x.id)))
      if (a && mockDb.approvals.length < 3) {
        const approval = { id: newId(), agentId: a.id, createdAt: now() }
        mockDb.approvals.push(approval)
        setStatus(a.id, 'BLOCKED', null) // chờ duyệt = bị chặn cho tới khi chủ duyệt
        log(a.id, 'Xin chủ duyệt')
        emit({ type: 'approval.requested', agentId: a.id, approvalId: approval.id })
      }
    } else if (!meetingOn) { // họp phòng: trưởng phòng + 2-4 nhân viên, kéo dài ~14s
      const d = pick(mockDb.departments)
      const members = mockDb.agents.filter((a) => a.departmentId === d.id)
      const ids = [...members.filter((a) => a.isHead), ...shuffle(members.filter((a) => !a.isHead)).slice(0, 2 + Math.floor(Math.random() * 3))].map((a) => a.id)
      meetingOn = true
      emit({ type: 'meeting.started', departmentId: d.id, agentIds: ids, endsAt: new Date(Date.now() + 14000).toISOString() })
      later(() => { emit({ type: 'meeting.ended', departmentId: d.id }); meetingOn = false }, 14000)
    }
    later(motionTick, rand(6000, 12000))
  }
  later(motionTick, rand(4000, 7000))
  // Chủ bấm "Duyệt" (mockApi gọi vào đây): BE phát approval.resolved và trả agent về trạng thái rảnh
  simulatorApprove = (approvalId) => {
    const i = mockDb.approvals.findIndex((a) => a.id === approvalId)
    if (i < 0) return
    const [done] = mockDb.approvals.splice(i, 1)
    emit({ type: 'approval.resolved', approvalId, approved: true })
    if (mockDb.agents.find((a) => a.id === done.agentId)?.status === 'BLOCKED') setStatus(done.agentId, 'IDLE', null)
    log(done.agentId, 'Chủ đã duyệt')
  }
  later(tick, rand(1000, 3000))

  const stopDevices = startDeviceSimulator(emit)
  const stopWork = startWorkEngine(emit, onReconnect)
  return () => { stopDevices(); stopWork(); stopped = true; timers.forEach(clearTimeout); timers.clear(); simulatorRun = null; simulatorGoal = null; simulatorApprove = null }
}

let simulatorRun: ((t: Task) => void) | null = null
let simulatorApprove: ((approvalId: string) => void) | null = null
let simulatorGoal: ((departmentId: string, tasks: Task[]) => void) | null = null
/** Giao task thủ công cho mock (Bước 2 mockApi sẽ gọi). */
export const runMockTask = (t: Task) => simulatorRun?.(t)
export const runMockGoal = (departmentId: string, tasks: Task[]) => simulatorGoal?.(departmentId, tasks)
export const runMockApprove = (approvalId: string) => simulatorApprove?.(approvalId)
