import { dayKey } from '../../lib/time'
import type { Project, ProjectSnapshot } from '../../types/project'
import type { UsageGroupBy, UsageSummary } from '../../types/cost'
import { mockDb } from '../db'
import { DAY } from './rng'
import { NOW, PRICES, bizTasks, calls, goalProject, projects, type Call } from './seed'

interface Range { from: string; to: string }
const inRange = (ms: number, r: Range) => ms >= Date.parse(r.from) && ms < Date.parse(r.to)
export const deptOf = (agentId: string) => mockDb.agents.find((a) => a.id === agentId)?.departmentId ?? null
export const prevOf = (r: Range): Range => { const len = Date.parse(r.to) - Date.parse(r.from); return { from: new Date(Date.parse(r.from) - len).toISOString(), to: r.from } }

/** Khoá + nhãn nhóm của một cuộc gọi. */
function keyOf(c: Call, by: UsageGroupBy): [string, string] {
  if (by === 'agent') return [c.agentId, mockDb.agents.find((a) => a.id === c.agentId)?.name ?? c.agentId]
  if (by === 'model') return [c.model, c.model]
  if (by === 'project') return [c.projectId ?? 'none', projects.find((p) => p.id === c.projectId)?.name ?? 'Không thuộc dự án']
  const d = deptOf(c.agentId)
  return [d ?? 'none', mockDb.departments.find((x) => x.id === d)?.name ?? 'Không thuộc phòng']
}

const sum = (cs: Call[]) => cs.reduce((s, c) => s + (c.costMicro ?? 0), 0)

export function usage(r: Range, groupBy: UsageGroupBy, f: { projectId?: string; agentId?: string }): UsageSummary {
  const ok = (c: Call) => (!f.projectId || c.projectId === f.projectId) && (!f.agentId || c.agentId === f.agentId)
  const cs = calls.filter((c) => inRange(c.at, r) && ok(c))
  const rows = new Map<string, UsageSummary['rows'][number]>()
  const days = new Map<string, { totalMicro: number; parts: Record<string, number> }>()
  for (let t = Date.parse(r.from); t < Math.min(Date.parse(r.to), NOW + DAY); t += DAY) days.set(dayKey(t), { totalMicro: 0, parts: {} })
  for (const c of cs) {
    const [key, label] = keyOf(c, groupBy)
    const row = rows.get(key) ?? { key, label, totalMicro: 0, calls: 0, inputTokens: 0, outputTokens: 0 }
    row.totalMicro += c.costMicro ?? 0; row.calls++; row.inputTokens += c.inTok; row.outputTokens += c.outTok
    rows.set(key, row)
    const day = days.get(dayKey(c.at))
    if (day) { day.totalMicro += c.costMicro ?? 0; day.parts[key] = (day.parts[key] ?? 0) + (c.costMicro ?? 0) }
  }
  const total = sum(cs)
  const tasks = new Set(cs.filter((c) => c.costMicro).map((c) => c.taskId)).size
  return {
    from: r.from, to: r.to, groupBy, totalMicro: total, prevTotalMicro: sum(calls.filter((c) => inRange(c.at, prevOf(r)) && ok(c))),
    calls: cs.length, inputTokens: cs.reduce((s, c) => s + c.inTok, 0), outputTokens: cs.reduce((s, c) => s + c.outTok, 0),
    avgPerTaskMicro: tasks ? Math.round(total / tasks) : null, unpricedCalls: cs.filter((c) => c.costMicro === null).length,
    byDay: [...days].map(([day, v]) => ({ day, ...v })), rows: [...rows.values()].sort((a, b) => b.totalMicro - a.totalMicro),
  }
}

// ---- Dự án ----
const WEIGHT = { HIGH: 3, NORMAL: 2, LOW: 1 }
/** Tiến độ = trọng số task xong / trọng số task chưa huỷ (task lỗi vẫn nằm trong mẫu số). */
export function projectView(p: Project): Project {
  const own = bizTasks.filter((t) => t.projectId === p.id)
  const c = { queued: 0, running: 0, awaitingApproval: 0, waitingBudget: 0, done: 0, failed: 0, cancelled: 0 }
  const key = { QUEUED: 'queued', RUNNING: 'running', AWAITING_APPROVAL: 'awaitingApproval', WAITING_BUDGET: 'waitingBudget', DONE: 'done', FAILED: 'failed', CANCELLED: 'cancelled' } as const
  let doneW = 0, liveW = 0
  for (const t of own) {
    c[key[t.status]]++
    if (t.status !== 'CANCELLED') liveW += WEIGHT[t.priority]
    if (t.status === 'DONE') doneW += WEIGHT[t.priority]
  }
  return { ...p, goalIds: [...goalProject].filter(([, pid]) => pid === p.id).map(([gid]) => gid), counts: c, progressPct: liveW ? Math.round((doneW / liveW) * 100) : 0, costMicro: sum(calls.filter((x) => x.projectId === p.id)) }
}

export function snapshots(id: string): ProjectSnapshot[] {
  const own = bizTasks.filter((t) => t.projectId === id)
  const live = own.filter((t) => t.status !== 'CANCELLED').length || 1
  return Array.from({ length: 30 }, (_, i) => {
    const end = NOW - (29 - i) * DAY
    return { day: dayKey(end), progressPct: Math.round((own.filter((t) => t.status === 'DONE' && Date.parse(t.updatedAt) <= end).length / live) * 100) }
  })
}

export const activity = (id: string) => bizTasks.filter((t) => t.projectId === id && t.status !== 'QUEUED').sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 40)
  .map((t) => ({ id: t.id, at: t.updatedAt, kind: t.status === 'FAILED' ? 'error' : 'info', message: `${t.title}: ${t.status === 'DONE' ? 'hoàn thành' : t.status === 'FAILED' ? `lỗi (${t.error})` : t.status === 'CANCELLED' ? 'đã huỷ' : 'đang chạy'}` }))

export const unpricedModels = () => [...new Set(calls.filter((c) => c.costMicro === null).map((c) => c.model))].filter((m) => !PRICES.some((p) => p.model === m))
