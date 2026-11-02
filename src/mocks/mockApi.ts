import { mockDb, mockTask, newId } from './db'
import { deviceRequest } from './devices'
import { taskRequest } from './biz/move'
import { historyRequest } from './biz/history'
import { budgetRequest } from './biz/budgets'
import { projectRequest } from './biz/projects'
import { notifyRequest } from './biz/notify'
import { bizRequest } from './biz/routes'
import { studioRequest } from './studio/routes'
import { floorRequest } from './floorRoutes'
import { workRequest } from './work'
import { runMockApprove, runMockGoal, runMockTask } from './simulator'
import type { Agent, AgentInput, Task } from '../types'

/** Giả lập server REST: nhận (method, path, body), trả JSON thuần như BE thật. */
export async function mockRequest(method: string, path: string, body: unknown): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 150)) // độ trễ mạng giả
  if (path === '/departments') return structuredClone(mockDb.departments)
  const floor = floorRequest(method, path)
  if (floor !== undefined) return structuredClone(floor)
  const biz = bizRequest(method, path) ?? notifyRequest(method, path, body) ?? taskRequest(method, path, body) ?? projectRequest(method, path, body) ?? budgetRequest(method, path, body) ?? historyRequest(method, path)
  if (biz !== undefined) return structuredClone(biz)
  const studio = studioRequest(method, path, body)
  if (studio !== undefined) return structuredClone(studio)
  const work = workRequest(method, path, body)
  if (work !== undefined) return structuredClone(work)
  const dev = deviceRequest(path)
  if (dev !== undefined) return structuredClone(dev)
  if (path.startsWith('/approvals')) {
    const m = path.match(/^\/approvals\/([^/]+)\/approve$/)
    if (!m) return structuredClone(mockDb.approvals.map((a) => ({ ...a, title: 'Yêu cầu duyệt' }))) // GET /approvals?status=PENDING
    runMockApprove(m[1])
    return { id: m[1], status: 'APPROVED' }
  }
  const dm = path.match(/^\/departments\/([^/]+)\/(stats|goals)$/)
  if (dm) return departmentRequest(dm[1], dm[2] as 'stats' | 'goals', body)
  const [, , id, sub] = path.split('/') // ['', 'agents', id?, 'tasks'?]
  const find = () => {
    const a = mockDb.agents.find((x) => x.id === id)
    if (!a) throw new Error(`Mock 404: không có agent ${id}`)
    return a
  }
  const out = (v: unknown) => structuredClone(v)

  if (!id) {
    if (method === 'GET') return out(mockDb.agents)
    const input = body as AgentInput
    const a: Agent = { ...input, departmentId: input.departmentId ?? null, id: newId(), status: 'IDLE', currentTask: null, isHead: false, runsOnDeviceId: null }
    mockDb.agents.push(a)
    return out(a)
  }
  if (sub === 'tasks') {
    find()
    if (method === 'GET') return out(mockDb.tasks.filter((t) => t.agentId === id).reverse())
    const { title, input } = body as { title: string; input: string }
    const now = new Date().toISOString()
    const task = mockTask({ id: newId(), agentId: id, title, input, status: 'QUEUED', result: null, createdAt: now, updatedAt: now })
    mockDb.tasks.push(task)
    runMockTask(task)
    return out(task)
  }
  const a = find()
  if (method === 'PUT') return out(Object.assign(a, body as AgentInput))
  if (method === 'DELETE') {
    mockDb.agents = mockDb.agents.filter((x) => x.id !== id)
    return null
  }
  return out(a)
}

/** GET /departments/:id/stats và POST /departments/:id/goals (xem docs/MISSING_API.md, mục A3 và B1). */
function departmentRequest(id: string, kind: 'stats' | 'goals', body: unknown) {
  const members = mockDb.agents.filter((a) => a.departmentId === id)
  const memberIds = new Set(members.map((a) => a.id))
  if (kind === 'stats') {
    const today = new Date().toDateString()
    const done = mockDb.tasks.filter((t) => memberIds.has(t.agentId) && t.status === 'DONE' && new Date(t.updatedAt).toDateString() === today).length
    const base = (Number(id) * 3) % 9 + 4 // nền giả để thẻ KPI không toàn số 0 lúc mới mở
    return { doneToday: base + done, tokenCostToday: +((base + done) * 0.13).toFixed(2) }
  }
  const goal = (body as { goal: string }).goal
  const dept = mockDb.departments.find((d) => d.id === id)
  const staff = members.filter((a) => !a.isHead)
  if (!dept || !staff.length) throw new Error(`Mock 400: phòng ${id} chưa có nhân viên`)
  // trưởng phòng chia việc cho 2-4 nhân viên, ưu tiên người đang rảnh
  const targets = [...staff].sort((a, b) => Number(b.status === 'IDLE') - Number(a.status === 'IDLE')).slice(0, Math.min(staff.length, 2 + Math.floor(Math.random() * 3)))
  const now = new Date().toISOString()
  const tasks: Task[] = targets.map((a, i) => mockTask({ id: newId(), agentId: a.id, title: `${goal.slice(0, 40)} (phần ${i + 1})`, input: goal, status: 'QUEUED', result: null, createdAt: now, updatedAt: now }))
  mockDb.tasks.push(...tasks)
  runMockGoal(id, tasks)
  return structuredClone({ id: newId(), departmentId: id, goal, createdAt: now, plan: tasks.map((t) => ({ agentId: t.agentId, taskTitle: t.title, taskId: t.id })) })
}
