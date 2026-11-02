import type { Task } from '../../types'
import type { StatsOverview } from '../../types/stats'
import { dayKey } from '../../lib/time'
import { mockDb } from '../db'
import { deptOf, prevOf } from './compute'
import { DAY } from './rng'
import { NOW, bizTasks, calls } from './seed'

interface Range { from: string; to: string }
const inR = (iso: string, r: Range) => Date.parse(iso) >= Date.parse(r.from) && Date.parse(iso) < Date.parse(r.to)
const dur = (t: Task) => (Date.parse(t.updatedAt) - Date.parse(t.startedAt ?? t.createdAt)) / 1000
const pctile = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0 }

function window(r: Range, ok: (t: Task) => boolean) {
  const own = bizTasks.filter((t) => ok(t) && inR(t.updatedAt, r))
  const done = own.filter((t) => t.status === 'DONE'), failed = own.filter((t) => t.status === 'FAILED')
  const retried = own.filter((t) => t.attempts > 1 && (t.status === 'DONE' || t.status === 'FAILED'))
  return {
    done, failed, retried,
    median: pctile(done.map(dur), 0.5), p90: pctile(done.map(dur), 0.9),
    errorRate: done.length + failed.length ? failed.length / (done.length + failed.length) : 0,
    cost: calls.filter((c) => inR(new Date(c.at).toISOString(), r) && ok(bizTasks.find((t) => t.id === c.taskId) as Task)).reduce((s, c) => s + (c.costMicro ?? 0), 0),
  }
}

export function overview(r: Range, f: { departmentId?: string; projectId?: string }): StatsOverview {
  const ok = (t: Task) => (!f.projectId || t.projectId === f.projectId) && (!f.departmentId || deptOf(t.agentId) === f.departmentId)
  const cur = window(r, ok), prev = window(prevOf(r), ok)
  const live = bizTasks.filter(ok)
  const count = (s: Task['status']) => live.filter((t) => t.status === s).length
  const byDay = new Map<string, { completed: number; failed: number; costMicro: number }>()
  for (let t = Date.parse(r.from); t < Math.min(Date.parse(r.to), NOW + DAY); t += DAY) byDay.set(dayKey(t), { completed: 0, failed: 0, costMicro: 0 })
  for (const t of cur.done) { const d = byDay.get(dayKey(t.updatedAt)); if (d) { d.completed++; d.costMicro += t.costMicro } }
  for (const t of cur.failed) { const d = byDay.get(dayKey(t.updatedAt)); if (d) d.failed++ }
  const buckets = [['< 1 phút', 60], ['1–5 phút', 300], ['5–15 phút', 900], ['15–60 phút', 3600], ['> 1 giờ', Infinity]] as const
  const deptCost = new Map<string, number>()
  for (const t of cur.done) { const k = deptOf(t.agentId) ?? 'none'; deptCost.set(k, (deptCost.get(k) ?? 0) + t.costMicro) }
  const perAgent = new Map<string, number>()
  for (const t of [...cur.done, ...cur.failed]) perAgent.set(t.agentId, (perAgent.get(t.agentId) ?? 0) + 1)
  const maxTasks = Math.max(1, ...perAgent.values())
  const groups = new Map<string, StatsOverview['errorGroups'][number]>()
  for (const t of cur.failed) {
    const k = t.error ?? 'Không rõ'
    const g = groups.get(k) ?? { key: k, message: k, count: 0, agentIds: [], lastTaskId: t.id, lastAt: t.updatedAt }
    g.count++
    if (!g.agentIds.includes(t.agentId)) g.agentIds.push(t.agentId)
    if (Date.parse(t.updatedAt) > Date.parse(g.lastAt)) { g.lastAt = t.updatedAt; g.lastTaskId = t.id }
    groups.set(k, g)
  }
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  for (const t of cur.done) { const d = new Date(Date.parse(t.updatedAt) + 7 * 3_600_000); heat[(d.getUTCDay() + 6) % 7][d.getUTCHours()]++ }
  const completed = cur.done.length
  return {
    updatedAt: new Date().toISOString(), from: r.from, to: r.to, enoughData: completed + cur.failed.length >= 5,
    completed: { value: completed, prev: prev.done.length }, medianSec: { value: cur.median, prev: prev.median }, p90Sec: cur.p90,
    errorRate: { value: cur.errorRate, prev: prev.errorRate }, recoveredRate: cur.retried.length ? cur.retried.filter((t) => t.status === 'DONE').length / cur.retried.length : null,
    cost: { value: cur.cost, prev: prev.cost }, running: count('RUNNING'), queued: count('QUEUED') + count('WAITING_BUDGET'), awaiting: count('AWAITING_APPROVAL'),
    byDay: [...byDay].map(([day, v]) => ({ day, ...v })),
    durationBuckets: buckets.map(([label, max], i) => ({ label, count: cur.done.filter((t) => dur(t) < max && dur(t) >= (i ? buckets[i - 1][1] : 0)).length })),
    costByDepartment: [...deptCost].map(([key, totalMicro]) => ({ key, label: mockDb.departments.find((d) => d.id === key)?.name ?? 'Không thuộc phòng', totalMicro })).sort((a, b) => b.totalMicro - a.totalMicro),
    busiestAgents: [...perAgent].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([agentId, tasks]) => {
      const mine = cur.done.concat(cur.failed).filter((t) => t.agentId === agentId)
      const queueDepth = bizTasks.filter((t) => t.agentId === agentId && (t.status === 'QUEUED' || t.status === 'WAITING_BUDGET')).length
      return { agentId, tasks, utilization: Math.min(0.97, 0.25 + (tasks / maxTasks) * 0.4 + queueDepth * 0.03), queueDepth, errorRate: mine.length ? mine.filter((t) => t.status === 'FAILED').length / mine.length : 0, costMicro: mine.reduce((s, t) => s + t.costMicro, 0) }
    }),
    errorGroups: [...groups.values()].sort((a, b) => b.count - a.count),
    heatmap: completed >= 20 ? heat : null,
  }
}
