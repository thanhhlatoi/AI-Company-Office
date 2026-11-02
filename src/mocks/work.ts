import { useRealtimeStore } from '../store/realtimeStore'
import { useWorkStore } from '../store/workStore'
import { ApprovalSchema, GoalSchema, type Agent, type Approval, type Goal, type PlanItem, type Priority, type RealtimeMessage, type Task } from '../types'
import { startBizLive } from './biz/live'
import { startStudioLive } from './studio/live'
import { projectView } from './biz/compute'
import { bizTasks, goalProject, projects } from './biz/seed'
import { mockDb, mockTask, newId } from './db'

// Mock "giao việc": mô phỏng BE theo schema GIẢ ĐỊNH (docs/MISSING_API.md mục H). Là đặc tả sống của các endpoint đó.
// Vòng đời một mục tiêu: PLANNING -> (kế hoạch đề xuất) AWAITING_PLAN_APPROVAL -> chủ duyệt -> RUNNING ->
// task chạy theo phụ thuộc, có handoff giữa người, một yêu cầu EXTERNAL (gửi mail) và một MONEY,
// một task lỗi rồi tự thử lại thành công -> DONE.
const rand = (min: number, max: number) => min + Math.random() * (max - min)
const iso = () => new Date().toISOString()
const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, NORMAL: 1, LOW: 2 }
const LOG_MAX = 300 // BE chỉ giữ ngần này event để bù; xa hơn -> `truncated`
const RETRY_AFTER_MS = 3000

type Ev = RealtimeMessage & { id: number }
const goals = new Map<string, Goal>()
const tasks: Task[] = []
const approvals = new Map<string, Approval>()
const planKey = new Map<string, string>() // taskId -> key trong kế hoạch (quyết định kịch bản lỗi / duyệt)
const retrying = new Set<string>() // task FAILED đang chờ tự thử lại (chưa phải kết thúc)
let system: { state: 'RUNNING' | 'PAUSED'; reason: string | null } = { state: 'RUNNING', reason: null }
let seq = 0
const log: Ev[] = []
let online = true // false = giả lập mất kết nối: event vẫn ghi vào log nhưng không tới FE
let emit: (m: RealtimeMessage) => void = () => {}
let later: (fn: () => void, ms: number) => void = () => {}

export const isPaused = () => system.state === 'PAUSED'
export const workTasks = () => tasks
/** Phát một sự kiện có id (cho mock Prompt 3C) */
export const publishEvent = (m: RealtimeMessage) => publish(m)

function publish(msg: RealtimeMessage) {
  const ev = structuredClone({ ...msg, id: ++seq }) as Ev // sao chép: store FE giữ tham chiếu, không được bị mock sửa ngầm
  log.push(ev)
  if (log.length > LOG_MAX) log.shift()
  if (online) emit(structuredClone(ev))
}

const agentOf = (id: string) => mockDb.agents.find((a) => a.id === id) as Agent
/** Task của mục tiêu (engine) hoặc task nền 30 ngày (biz): cùng một bộ thao tác huỷ/thử lại/đổi ưu tiên/di chuyển */
export const taskOf = (id: string) => tasks.find((t) => t.id === id) ?? bizTasks.find((t) => t.id === id)
const tasksOf = (goalId: string) => tasks.filter((t) => t.goalId === goalId)

export function setAgent(id: string, status: Agent['status'], task: Task | null) {
  const a = agentOf(id)
  a.status = status
  a.currentTask = task && { id: task.id, title: task.title }
  publish({ type: 'agent.status_changed', agentId: id, status, currentTask: a.currentTask })
}
const touchGoal = (g: Goal, patch: Partial<Goal>) => { Object.assign(g, patch, { updatedAt: iso() }); publish({ type: 'goal.updated', goal: g }) }
export const touchTask = (t: Task, patch: Partial<Task>) => { Object.assign(t, patch, { updatedAt: iso(), version: t.version + 1 }); publish({ type: 'task.updated', task: t }) }

// ---- Lập kế hoạch ----
function propose(g: Goal) {
  const dept = mockDb.departments.find((d) => d.id === g.departmentId)
    ?? mockDb.departments.find((d) => mockDb.agents.filter((a) => a.departmentId === d.id && !a.isHead).length >= 4) as (typeof mockDb.departments)[number]
  const members = mockDb.agents.filter((a) => a.departmentId === dept.id)
  const staff = members.filter((a) => !a.isHead)
  const head = members.find((a) => a.isHead) ?? staff[0]
  const who = (i: number) => (staff[i % staff.length] ?? head).id
  const est = () => Math.round(rand(1500, 3500))
  const plan: PlanItem[] = [
    { key: 'p1', title: 'Thu thập số liệu', assigneeId: who(0), priority: 'HIGH', dependsOn: [], estimateTokens: est() },
    { key: 'p2', title: 'Soạn báo cáo', assigneeId: who(1), priority: 'NORMAL', dependsOn: ['p1'], estimateTokens: est() },
    { key: 'p3', title: 'Gửi email báo cáo cho khách', assigneeId: who(2), priority: 'NORMAL', dependsOn: ['p2'], estimateTokens: est() },
    { key: 'p4', title: 'Thanh toán chi phí quảng cáo', assigneeId: who(3), priority: 'NORMAL', dependsOn: ['p2'], estimateTokens: est() },
    { key: 'p5', title: 'Tổng hợp và đóng mục tiêu', assigneeId: head.id, priority: 'LOW', dependsOn: ['p3', 'p4'], estimateTokens: est() },
  ]
  touchGoal(g, { departmentId: dept.id, plan, status: g.requirePlanApproval ? 'AWAITING_PLAN_APPROVAL' : 'RUNNING' })
  if (!g.requirePlanApproval) startGoal(g)
}

function startGoal(g: Goal) {
  const idOfKey = new Map<string, string>()
  g.plan.forEach((p) => idOfKey.set(p.key, newId()))
  const head = mockDb.departments.find((d) => d.id === g.departmentId)?.headAgentId ?? null
  for (const p of g.plan) {
    const id = idOfKey.get(p.key) as string
    const t = mockTask({
      id, agentId: p.assigneeId, title: p.title, input: g.description, status: 'QUEUED', result: null, createdAt: iso(), updatedAt: iso(),
      goalId: g.id, priority: p.priority, dependsOn: p.dependsOn.map((k) => idOfKey.get(k)), assignedById: head,
    })
    planKey.set(id, p.key)
    tasks.push(t)
    mockDb.tasks.push(t) // tab "Lịch sử" của agent cũng thấy
    publish({ type: 'task.created', task: t })
  }
}

// ---- Thực thi ----
export const depsDone = (t: Task) => t.dependsOn.every((d) => taskOf(d)?.status === 'DONE')
const busy = (agentId: string) => agentOf(agentId).status !== 'IDLE'

function tick() {
  if (system.state === 'PAUSED') return
  const ready = tasks.filter((t) => t.status === 'QUEUED' && goals.get(t.goalId ?? '')?.status === 'RUNNING' && depsDone(t))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
  for (const t of ready) if (!busy(t.agentId)) run(t)
}

function run(t: Task) {
  touchTask(t, { status: 'RUNNING', startedAt: iso(), attempts: t.attempts + 1, error: null })
  setAgent(t.agentId, 'WORKING', t)
  publish({ type: 'event.created', event: { id: newId(), agentId: t.agentId, message: `Bắt đầu: ${t.title}`, createdAt: iso() } })
  later(() => {
    if (t.status !== 'RUNNING') return // đã bị huỷ
    const key = planKey.get(t.id)
    if (key === 'p2' && t.attempts === 1) return fail(t, 'Hết thời gian chờ API số liệu', true)
    if (key === 'p3') return askApproval(t, 'EXTERNAL', 'send_email', { to: 'khach.hang@example.com', subject: 'Báo cáo kết quả tuần này', body: 'Chào anh,\n\nEm gửi anh báo cáo kết quả tuần này (đính kèm).\nNếu cần thêm số liệu, anh báo em nhé.\n\nTrân trọng,\nPhòng Kinh doanh' })
    if (key === 'p4') return askApproval(t, 'MONEY', 'pay_invoice', { payee: 'Facebook Ads', amount: 2000000, currency: 'VND', note: 'Chi phí quảng cáo tháng này' })
    done(t)
  }, rand(4000, 6500))
}

function done(t: Task) {
  const used = Math.round(rand(800, 3000))
  touchTask(t, { status: 'DONE', result: `## Kết quả\n\nĐã hoàn thành **${t.title}**.\n\n- Mục 1\n- Mục 2`, tokensUsed: t.tokensUsed + used })
  setAgent(t.agentId, 'IDLE', null)
  publish({ type: 'event.created', event: { id: newId(), agentId: t.agentId, message: `Hoàn thành: ${t.title}`, createdAt: iso() } })
  const g = goals.get(t.goalId ?? '')
  if (g) {
    touchGoal(g, { tokensUsed: g.tokensUsed + used })
    // người kế tiếp khác người vừa xong: giao việc bằng tay (hiện đường nối + bong bóng)
    for (const n of tasksOf(g.id)) {
      if (n.status === 'QUEUED' && n.dependsOn.includes(t.id) && n.agentId !== t.agentId) {
        publish({ type: 'task.handoff', fromAgentId: t.agentId, toAgentId: n.agentId, taskId: n.id, message: `Mình xong "${t.title}", đến lượt bạn` })
      }
    }
    closeIfFinished(g)
  }
}

function fail(t: Task, error: string, autoRetry: boolean) {
  touchTask(t, { status: 'FAILED', error })
  setAgent(t.agentId, 'IDLE', null)
  publish({ type: 'event.created', event: { id: newId(), agentId: t.agentId, message: `Lỗi: ${error}`, createdAt: iso() } })
  if (autoRetry) {
    retrying.add(t.id)
    later(() => { retrying.delete(t.id); if (t.status === 'FAILED') touchTask(t, { status: 'QUEUED', error: null }) }, RETRY_AFTER_MS)
  } else {
    const g = goals.get(t.goalId ?? '')
    if (g) closeIfFinished(g)
  }
}

/** Task xong nhưng cần chủ duyệt trước khi thực hiện hành động nhạy cảm: agent dừng ở BLOCKED. */
function askApproval(t: Task, riskType: Approval['riskType'], action: string, args: Record<string, unknown>) {
  const a = ApprovalSchema.parse({
    id: newId(), agentId: t.agentId, title: t.title, createdAt: iso(), riskType, goalId: t.goalId, taskId: t.id, action, argsSnapshot: args,
    expiresAt: new Date(Date.now() + 10 * 60000).toISOString(), status: 'PENDING',
  })
  approvals.set(a.id, a)
  touchTask(t, { status: 'AWAITING_APPROVAL', locked: true }) // cột "Chờ duyệt" của Kanban: khoá, không kéo
  setAgent(t.agentId, 'BLOCKED', t)
  publish({ type: 'approval.requested', agentId: a.agentId, approvalId: a.id, approval: a })
}

function decide(a: Approval, approved: boolean, reason?: string) {
  if (a.status !== 'PENDING') throw new Error(`Mock 409: yêu cầu ${a.id} đã xử lý`)
  Object.assign(a, { status: approved ? 'APPROVED' : 'REJECTED', decisionReason: reason ?? null, decidedAt: iso() })
  publish({ type: 'approval.resolved', approvalId: a.id, approved, status: a.status, reason: a.decisionReason })
  const t = a.taskId ? taskOf(a.taskId) : undefined
  if (!t && agentOf(a.agentId).status === 'BLOCKED') setAgent(a.agentId, 'IDLE', null) // yêu cầu demo không gắn task
  if (t && t.status === 'AWAITING_APPROVAL') {
    touchTask(t, { status: 'RUNNING', locked: false })
    setAgent(t.agentId, 'WORKING', t)
    if (approved) later(() => { if (t.status === 'RUNNING') done(t) }, 1200)
    else fail(t, `Bị từ chối: ${reason ?? ''}`.trim(), false)
  }
  return a
}

/** Đóng mục tiêu khi mọi task đã kết thúc; task chờ phụ thuộc đã thất bại thì huỷ theo. */
function closeIfFinished(g: Goal) {
  const own = tasksOf(g.id)
  const finalFail = (t: Task) => t.status === 'FAILED' && !retrying.has(t.id)
  for (const t of own) {
    if (t.status === 'QUEUED' && t.dependsOn.some((d) => { const x = taskOf(d); return x && (finalFail(x) || x.status === 'CANCELLED') })) {
      touchTask(t, { status: 'CANCELLED', error: 'Phụ thuộc thất bại' })
    }
  }
  if (g.status !== 'RUNNING' || own.some((t) => t.status === 'QUEUED' || t.status === 'RUNNING' || t.status === 'AWAITING_APPROVAL' || retrying.has(t.id))) return
  touchGoal(g, { status: own.every((t) => t.status === 'DONE') ? 'DONE' : 'FAILED', finishedAt: iso() })
}

function cancelGoal(g: Goal) {
  for (const t of tasksOf(g.id)) {
    if (t.status === 'QUEUED' || t.status === 'RUNNING' || t.status === 'AWAITING_APPROVAL' || t.status === 'FAILED') {
      if (t.status === 'RUNNING' || t.status === 'AWAITING_APPROVAL') setAgent(t.agentId, 'IDLE', null)
      touchTask(t, { status: 'CANCELLED', error: 'Mục tiêu bị huỷ' })
    }
  }
  for (const a of approvals.values()) if (a.goalId === g.id && a.status === 'PENDING') decide(a, false, 'Mục tiêu bị huỷ')
  touchGoal(g, { status: 'CANCELLED', finishedAt: iso() })
  return g
}

// ---- REST giả ----
const must = <T,>(v: T | undefined, what: string): T => { if (v === undefined) throw new Error(`Mock 404: không có ${what}`); return v }

/** Các route của mục H. undefined = không phải route của mock này (để mockApi xử lý tiếp). */
export function workRequest(method: string, fullPath: string, body: unknown): unknown {
  const [path, qs = ''] = fullPath.split('?')
  const q = new URLSearchParams(qs)
  const b = (body ?? {}) as Record<string, unknown>
  const seg = path.split('/') // ['', 'goals', id, action]
  if (path === '/system') return { ...system, lastEventId: seq }
  if (method === 'POST' && (path === '/system/pause' || path === '/system/resume')) {
    system = path.endsWith('pause') ? { state: 'PAUSED', reason: (b.reason as string) ?? null } : { state: 'RUNNING', reason: null }
    publish({ type: 'system.state_changed', state: system.state, reason: system.reason })
    return { ...system, lastEventId: seq }
  }
  if (path === '/events') {
    const after = Number(q.get('afterId') ?? 0), limit = Number(q.get('limit') ?? 500)
    const oldest = log[0]?.id ?? seq + 1 // log trống = đã bị xoá hết
    const truncated = oldest > after + 1 && after < seq
    return { events: truncated ? [] : log.filter((e) => e.id > after).slice(0, limit), truncated, lastId: seq }
  }
  if (seg[1] === 'goals') {
    if (!seg[2]) {
      if (method === 'GET') return [...goals.values()]
      const now = iso()
      const g = GoalSchema.parse({ ...b, id: newId(), status: 'PLANNING', createdAt: now, updatedAt: now })
      goals.set(g.id, g)
      publish({ type: 'goal.created', goal: g })
      later(() => propose(g), 1500)
      return g
    }
    const g = must(goals.get(seg[2]), `mục tiêu ${seg[2]}`)
    if (!seg[3]) return g
    if (seg[3] === 'project' && method === 'POST') { // gán / chuyển mục tiêu sang dự án (projectId null = bỏ khỏi dự án)
      const to = (b.projectId as string | null) ?? null
      const from = goalProject.get(g.id)
      if (to) goalProject.set(g.id, to); else goalProject.delete(g.id)
      touchGoal(g, { projectId: to })
      for (const pid of new Set([from, to])) { const p = projects.find((x) => x.id === pid); if (p) publish({ type: 'project.updated', project: projectView(p) }) }
      return g
    }
    if (seg[3] === 'approve-plan') {
      if (g.status !== 'AWAITING_PLAN_APPROVAL') throw new Error('Mock 409: kế hoạch không ở trạng thái chờ duyệt')
      touchGoal(g, { status: 'RUNNING' }); startGoal(g); return g
    }
    if (seg[3] === 'reject-plan') { touchGoal(g, { status: 'REJECTED', rejectReason: String(b.reason ?? ''), finishedAt: iso() }); return g }
    if (seg[3] === 'cancel') return cancelGoal(g)
  }
  if (seg[1] === 'tasks') {
    if (!seg[2]) return method === 'GET' ? [...tasks, ...bizTasks.filter((t) => t.goalId)] : undefined // task nền thuộc mục tiêu mẫu cũng cần để tính tiến độ mục tiêu
    const t = must(taskOf(seg[2]), `task ${seg[2]}`)
    if (!seg[3] && method === 'GET') return t
    if (seg[3] === 'cancel') {
      if (t.status === 'RUNNING' || t.status === 'AWAITING_APPROVAL') setAgent(t.agentId, 'IDLE', null)
      touchTask(t, { status: 'CANCELLED', error: 'Chủ đã huỷ' })
      const g = goals.get(t.goalId ?? '')
      if (g) closeIfFinished(g)
      return t
    }
    if (seg[3] === 'retry') {
      if (t.status !== 'FAILED') throw new Error('Mock 409: chỉ thử lại task FAILED')
      touchTask(t, { status: 'QUEUED', error: null })
      const g = goals.get(t.goalId ?? '')
      if (g) { // cứu cả các task bị huỷ vì phụ thuộc vào task này
        for (const n of tasksOf(g.id)) if (n.status === 'CANCELLED' && n.error === 'Phụ thuộc thất bại') touchTask(n, { status: 'QUEUED', error: null })
        if (g.status === 'FAILED') touchGoal(g, { status: 'RUNNING', finishedAt: null })
      }
      return t
    }
    if (seg[3] === 'priority') { touchTask(t, { priority: b.priority as Priority }); return t }
  }
  if (seg[1] === 'approvals') {
    // Hợp nhất yêu cầu của mock cũ (mockDb.approvals, chỉ {id, agentId}) với yêu cầu của mock này
    if (!seg[2] && method === 'GET') {
      const legacy = mockDb.approvals.map((l) => ApprovalSchema.parse({ ...l, title: 'Yêu cầu duyệt' }))
      const all = [...legacy, ...approvals.values()]
      return q.get('status') === 'ALL' ? all : all.filter((a) => a.status === 'PENDING')
    }
    const a = approvals.get(seg[2])
    const old = !a && seg[3] === 'reject' ? mockDb.approvals.find((l) => l.id === seg[2]) : undefined
    if (old) { // yêu cầu của mock cũ: từ chối = bỏ yêu cầu, trả agent về rảnh
      mockDb.approvals.splice(mockDb.approvals.indexOf(old), 1)
      publish({ type: 'approval.resolved', approvalId: old.id, approved: false, status: 'REJECTED', reason: String(b.reason ?? '') })
      if (agentOf(old.agentId).status === 'BLOCKED') setAgent(old.agentId, 'IDLE', null)
      return { id: old.id, status: 'REJECTED' }
    }
    if (a && seg[3] === 'approve') return decide(a, true)
    if (a && seg[3] === 'reject') return decide(a, false, String(b.reason ?? ''))
  }
  return undefined
}

/** Tạo một yêu cầu duyệt thật (có thể duyệt / từ chối qua /approvals/{id}/...) cho một agent: dùng cho mock Prompt 4D */
export function raiseApproval(agentId: string, riskType: Approval['riskType'], action: string, argsSnapshot: Record<string, unknown>, title: string, taskId?: string): Approval {
  const a = ApprovalSchema.parse({ id: newId(), agentId, title, createdAt: iso(), riskType, action, taskId, argsSnapshot, expiresAt: new Date(Date.now() + 10 * 60000).toISOString() })
  approvals.set(a.id, a)
  publish({ type: 'approval.requested', agentId, approvalId: a.id, approval: a })
  return a
}

/** Khởi động engine: bộ chạy task + công cụ dev (`window.__work`) để thử mà chưa có giao diện. */
export function startWorkEngine(emitFn: (m: RealtimeMessage) => void, onReconnect: () => void): () => void {
  emit = emitFn
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let stopped = false
  later = (fn, ms) => {
    const h = setTimeout(() => { timers.delete(h); if (!stopped) fn() }, ms)
    timers.add(h)
  }
  const loop = setInterval(tick, 1000)
  const stopBiz = startBizLive(publish)
  const stopStudio = startStudioLive(publish)
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __work: {
        store: useWorkStore,
        /** Tạo mục tiêu; auto = tự duyệt kế hoạch + tự duyệt các yêu cầu sau 4s */
        newGoal: (title = 'Báo cáo kết quả tuần', requirePlanApproval = true) =>
          workRequest('POST', '/goals', { title, description: 'Mục tiêu thử', requirePlanApproval }) as Goal,
        approvePlan: (id: string) => workRequest('POST', `/goals/${id}/approve-plan`, null),
        approve: (id: string) => workRequest('POST', `/approvals/${id}/approve`, null),
        reject: (id: string, reason = 'Không đồng ý') => workRequest('POST', `/approvals/${id}/reject`, { reason }),
        /** Giả lập mất mạng: event vẫn xảy ra ở "BE" nhưng không tới FE */
        offline: () => { online = false; useRealtimeStore.getState().setConnection('connecting') },
        online: () => { online = true; useRealtimeStore.getState().setConnection('connected'); onReconnect() },
        /** Xoá log sự kiện của BE giả: lần bù kế tiếp sẽ nhận `truncated` và phải tải lại toàn bộ */
        dropLog: () => { log.length = 0 },
        /** Tạo nhanh một yêu cầu duyệt (không gắn task) để thử giao diện: risk = EXTERNAL | MONEY | DESTRUCTIVE */
        demoApproval: (risk: Approval['riskType'] = 'EXTERNAL') => {
          const agent = mockDb.agents.find((x) => x.status === 'IDLE' && x.departmentId) as Agent
          const args = {
            EXTERNAL: { to: 'khach.hang@example.com', subject: 'Báo giá tháng 11', body: 'Chào anh,\n\nEm gửi báo giá như đính kèm.\nAnh xem giúp em nhé.\n\nTrân trọng' },
            MONEY: { payee: 'Công ty ABC', amount: 25000000, currency: 'VND', note: 'Đặt cọc hợp đồng' },
            DESTRUCTIVE: { action: 'Xoá toàn bộ bản nháp video cũ', path: '/storage/videos/drafts', files: 128 },
          }[risk]
          const a = ApprovalSchema.parse({ id: newId(), agentId: agent.id, title: 'Yêu cầu thử', createdAt: iso(), riskType: risk, action: risk.toLowerCase(), argsSnapshot: args, expiresAt: new Date(Date.now() + 5 * 60000).toISOString() })
          approvals.set(a.id, a)
          setAgent(agent.id, 'BLOCKED', null)
          publish({ type: 'approval.requested', agentId: a.agentId, approvalId: a.id, approval: a })
          return a.id
        },
        pause: () => workRequest('POST', '/system/pause', {}),
        resume: () => workRequest('POST', '/system/resume', null),
      },
    })
  }
  return () => { stopBiz(); stopStudio(); stopped = true; clearInterval(loop); timers.forEach(clearTimeout); timers.clear() }
}

// Task nền đang "Chờ duyệt" cũng có yêu cầu duyệt thật, để bấm thẻ trên Kanban mở được hộp thư phê duyệt
for (const t of bizTasks) {
  if (t.status !== 'AWAITING_APPROVAL') continue
  const a = ApprovalSchema.parse({
    id: newId(), agentId: t.agentId, title: t.title, createdAt: t.updatedAt, riskType: 'EXTERNAL', taskId: t.id, action: 'send_email',
    argsSnapshot: { to: 'khach.hang@example.com', subject: t.title, body: 'Chào anh,\n\nEm gửi anh nội dung như đã trao đổi.\n\nTrân trọng' },
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), status: 'PENDING',
  })
  approvals.set(a.id, a)
}

// Mục tiêu mẫu của 3 dự án (2 mỗi dự án): gắn một phần task nền vào mục tiêu để có "tiến độ từng mục tiêu"
projects.forEach((p, pi) => {
  const own = bizTasks.filter((t) => t.projectId === p.id && !t.goalId)
  ;[own.filter((t) => t.status !== 'DONE'), own.filter((t) => t.status === 'DONE')].forEach((pool, gi) => {
    const mine = pool.slice(0, gi === 0 ? 14 : 18)
    const id = String(700 + pi * 2 + gi)
    const now = new Date().toISOString()
    const g = GoalSchema.parse({
      id, title: gi === 0 ? `${p.name}: giai đoạn đang chạy` : `${p.name}: giai đoạn đã xong`, description: 'Mục tiêu mẫu', departmentId: p.departmentId, projectId: p.id,
      tokensUsed: mine.reduce((s, t) => s + t.tokensUsed, 0), requirePlanApproval: true, createdAt: mine[0]?.createdAt ?? now, updatedAt: now,
      status: mine.length && mine.every((t) => t.status === 'DONE') ? 'DONE' : 'RUNNING',
    })
    mine.forEach((t) => { t.goalId = id })
    goals.set(id, g)
    goalProject.set(id, p.id)
  })
})
