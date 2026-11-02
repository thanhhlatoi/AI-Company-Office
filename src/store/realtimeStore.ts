import { create } from 'zustand'
import { MAX_EVENTS_PER_AGENT } from '../lib/config'
import type { AgentEvent, Approval, ConnectionState, MotionMessage } from '../types'

export interface Dispatch { departmentId: string; headId: string; targetAgentIds: string[]; at: number }

interface RealtimeState {
  connectionState: ConnectionState
  eventsByAgent: Record<string, AgentEvent[]>
  /** Lần chia việc gần nhất; `at` làm cho hai lần giống hệt nhau vẫn là hai sự kiện khác nhau. */
  lastDispatch: Dispatch | null
  setDispatch: (d: Dispatch) => void
  /** Sự kiện di chuyển mới nhất; `seq` tăng dần để hai sự kiện giống hệt nhau vẫn khác nhau. */
  lastMotion: { seq: number; event: MotionMessage } | null
  pushMotion: (e: MotionMessage) => void
  /** Yêu cầu duyệt đang chờ: approvalId -> agentId. Nguồn thật cho tay giơ lên và nút "Duyệt". */
  approvals: Record<string, string>
  setApprovals: (list: Approval[]) => void
  addApproval: (approvalId: string, agentId: string) => void
  resolveApproval: (approvalId: string) => void
  setConnection: (s: ConnectionState) => void
  addEvent: (e: AgentEvent) => void
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connectionState: 'connecting',
  eventsByAgent: {},
  lastDispatch: null,
  setDispatch: (lastDispatch) => set({ lastDispatch }),
  lastMotion: null,
  pushMotion: (event) => set((s) => ({ lastMotion: { seq: (s.lastMotion?.seq ?? 0) + 1, event } })),
  approvals: {},
  setApprovals: (list) => set({ approvals: Object.fromEntries(list.map((a) => [a.id, a.agentId])) }),
  addApproval: (approvalId, agentId) => set((s) => ({ approvals: { ...s.approvals, [approvalId]: agentId } })),
  resolveApproval: (approvalId) => set((s) => { const { [approvalId]: _gone, ...rest } = s.approvals; return { approvals: rest } }),
  setConnection: (connectionState) => set({ connectionState }),
  addEvent: (e) =>
    set((s) => ({
      // giữ tối đa 200 dòng mới nhất mỗi agent
      eventsByAgent: { ...s.eventsByAgent, [e.agentId]: [...(s.eventsByAgent[e.agentId] ?? []), e].slice(-MAX_EVENTS_PER_AGENT) },
    })),
}))
