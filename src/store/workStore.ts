import { create } from 'zustand'
import type { Approval, ApprovalStatus, Goal, SystemState, Task } from '../types'

export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error'

interface WorkState {
  goalsById: Record<string, Goal>
  tasksById: Record<string, Task>
  /** chỉ mục id task theo agent / theo mục tiêu (giữ đồng bộ trong upsertTask) */
  taskIdsByAgent: Record<string, string[]>
  taskIdsByGoal: Record<string, string[]>
  approvalsById: Record<string, Approval>
  system: Pick<SystemState, 'state' | 'reason'>
  /** id DomainEvent đã áp dụng gần nhất; null = chưa có ảnh chụp ban đầu (sự kiện đến sớm được giữ lại, xem eventSync) */
  lastEventId: number | null
  sync: SyncStatus
  replaceAll: (d: { goals: Goal[]; tasks: Task[]; approvals: Approval[]; system: SystemState }) => void
  upsertGoal: (g: Goal) => void
  upsertTask: (t: Task) => void
  upsertApproval: (a: Approval) => void
  resolveApproval: (id: string, status: ApprovalStatus, reason?: string | null) => void
  setSystem: (state: SystemState['state'], reason?: string | null) => void
  setLastEventId: (id: number | null) => void
  setSync: (s: SyncStatus) => void
}

const group = (tasks: Task[], key: (t: Task) => string | null | undefined) => {
  const out: Record<string, string[]> = {}
  for (const t of tasks) { const k = key(t); if (k) (out[k] ??= []).push(t.id) }
  return out
}
const without = (ids: string[] | undefined, id: string) => (ids ?? []).filter((x) => x !== id)
const withId = (ids: string[] | undefined, id: string) => (ids?.includes(id) ? ids : [...(ids ?? []), id])

export const useWorkStore = create<WorkState>((set) => ({
  goalsById: {},
  tasksById: {},
  taskIdsByAgent: {},
  taskIdsByGoal: {},
  approvalsById: {},
  system: { state: 'RUNNING', reason: null },
  lastEventId: null,
  sync: 'idle',
  replaceAll: ({ goals, tasks, approvals, system }) => set({
    goalsById: Object.fromEntries(goals.map((g) => [g.id, g])),
    tasksById: Object.fromEntries(tasks.map((t) => [t.id, t])),
    taskIdsByAgent: group(tasks, (t) => t.agentId),
    taskIdsByGoal: group(tasks, (t) => t.goalId),
    approvalsById: Object.fromEntries(approvals.map((a) => [a.id, a])),
    system: { state: system.state, reason: system.reason },
    lastEventId: system.lastEventId,
  }),
  upsertGoal: (g) => set((s) => ({ goalsById: { ...s.goalsById, [g.id]: g } })),
  upsertTask: (t) => set((s) => {
    const old = s.tasksById[t.id]
    const byAgent = { ...s.taskIdsByAgent }
    const byGoal = { ...s.taskIdsByGoal }
    if (old && old.agentId !== t.agentId) byAgent[old.agentId] = without(byAgent[old.agentId], t.id) // giao lại cho người khác
    byAgent[t.agentId] = withId(byAgent[t.agentId], t.id)
    if (old?.goalId && old.goalId !== t.goalId) byGoal[old.goalId] = without(byGoal[old.goalId], t.id)
    if (t.goalId) byGoal[t.goalId] = withId(byGoal[t.goalId], t.id)
    return { tasksById: { ...s.tasksById, [t.id]: t }, taskIdsByAgent: byAgent, taskIdsByGoal: byGoal }
  }),
  upsertApproval: (a) => set((s) => ({ approvalsById: { ...s.approvalsById, [a.id]: a } })),
  // Event "resolved" có thể đến trước khi biết yêu cầu (mất kết nối): bỏ qua, ảnh chụp lần sau sẽ có
  resolveApproval: (id, status, reason) => set((s) => {
    const a = s.approvalsById[id]
    return a ? { approvalsById: { ...s.approvalsById, [id]: { ...a, status, decisionReason: reason ?? a.decisionReason, decidedAt: new Date().toISOString() } } } : s
  }),
  setSystem: (state, reason) => set({ system: { state, reason: reason ?? null } }),
  setLastEventId: (lastEventId) => set({ lastEventId }),
  setSync: (sync) => set({ sync }),
}))
