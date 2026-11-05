import type { Agent, AgentStatus } from '../../types'
import type { Layout } from '../../types/floor'
import { generateLayout } from './layoutGen'

const STATUSES: AgentStatus[] = ['IDLE', 'WORKING', 'WORKING', 'BLOCKED', 'ERROR', 'OFFLINE']

/** Chỉ dev (`?stress=60`): một tầng với n agent giả để đo hiệu năng. */
export function stressSetup(n: number): { layout: Layout; agents: Agent[] } {
  const agents: Agent[] = Array.from({ length: n }, (_, i) => ({
    id: `stress-${i}`, name: `NV ${i + 1}`, role: 'Nhân viên thử', model: 'x', skills: [], systemPrompt: '', color: ['#4f46e5', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899'][i % 5],
    status: STATUSES[i % STATUSES.length], currentTask: null, departmentId: null, isHead: i === 0, runsOnDeviceId: null,
  }))
  const layout = generateLayout('stress', [{ id: 'stress', slug: 'stress', name: 'Stress', floor: '#e8f0fe', wall: '#bcd0f7', members: agents.map((a) => ({ id: a.id, isHead: a.isHead })) }])
  return { layout, agents }
}
