import { DEPARTMENTS, type Member } from '../config/departments'
import { PALETTES } from '../styles/tokens'
import { TaskSchema, type Agent, type AgentEvent, type Department, type Task } from '../types'

// Cơ sở dữ liệu giả trong bộ nhớ (mất khi F5), dựng từ config/departments.ts.
const SHIRTS = ['#4f46e5', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899', '#84cc16', '#f43f5e', '#7c3aed']

const agents: Agent[] = []
const departments: Department[] = []
let agentSeq = 0

DEPARTMENTS.filter((d) => d.enabled).forEach((d, order) => {
  const departmentId = String(order + 1)
  const make = (m: Member, isHead: boolean): Agent => {
    const id = String(++agentSeq)
    return {
      id, name: m.name, role: m.role, model: 'claude-sonnet-5-5',
      systemPrompt: `Bạn là ${m.name} (${m.role}) thuộc phòng ${d.name}.`,
      // trưởng phòng mặc áo màu phòng cho dễ nhận
      color: isHead ? PALETTES[d.palette].accent : SHIRTS[agentSeq % SHIRTS.length],
      status: 'IDLE', currentTask: null, departmentId, isHead, runsOnDeviceId: m.runsOn ?? null, skills: m.skills ?? [],
    }
  }
  const head = make(d.head, true)
  agents.push(head, ...d.staff.map((m) => make(m, false)))
  departments.push({ id: departmentId, name: d.name, slug: d.slug, icon: d.icon, color: PALETTES[d.palette].accent, headAgentId: head.id, order })
})

export const mockDb = {
  agents,
  departments,
  tasks: [] as Task[],
  events: [] as AgentEvent[],
  /** yêu cầu chờ duyệt đang mở */
  approvals: [] as { id: string; agentId: string; createdAt: string }[],
  nextId: 1000,
}

/** Task đầy đủ field (điền mặc định của zod) từ các field cốt lõi. */
export const mockTask = (t: Parameters<typeof TaskSchema.parse>[0]): Task => TaskSchema.parse(t)

export const newId = () => String(mockDb.nextId++)
