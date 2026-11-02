import { create } from 'zustand'
import type { Agent, AgentStatus } from '../types'

interface AgentState {
  agentsById: Record<string, Agent>
  selectedAgentId: string | null
  setAgents: (list: Agent[]) => void
  upsertAgent: (a: Agent) => void
  removeAgent: (id: string) => void
  applyStatus: (id: string, status: AgentStatus, currentTask: Agent['currentTask']) => void
  select: (id: string | null) => void
}

export const useAgentStore = create<AgentState>((set) => ({
  agentsById: {},
  selectedAgentId: null,
  // Thay toàn bộ map (dùng khi tải/đồng bộ lại từ API)
  setAgents: (list) => set({ agentsById: Object.fromEntries(list.map((a) => [a.id, a])) }),
  upsertAgent: (a) => set((s) => ({ agentsById: { ...s.agentsById, [a.id]: a } })),
  removeAgent: (id) =>
    set((s) => {
      const { [id]: _removed, ...rest } = s.agentsById
      return { agentsById: rest, selectedAgentId: s.selectedAgentId === id ? null : s.selectedAgentId }
    }),
  applyStatus: (id, status, currentTask) =>
    set((s) => {
      const a = s.agentsById[id]
      // Agent chưa có trong store (event đến trước list): bỏ qua, lần đồng bộ sau sẽ có.
      return a ? { agentsById: { ...s.agentsById, [id]: { ...a, status, currentTask } } } : s
    }),
  select: (id) => set({ selectedAgentId: id }),
}))
