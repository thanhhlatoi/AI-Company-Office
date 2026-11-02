import { useMemo } from 'react'
import type { Agent } from '../types'
import { useAgentStore } from './agentStore'

export interface DepartmentStats { total: number; working: number; idle: number; error: number; offline: number }

/** Gom agent theo phòng, trưởng phòng đứng đầu. Chỉ tính từ agentsById (không lưu trùng). */
export function groupByDepartment(agentsById: Record<string, Agent>): Record<string, Agent[]> {
  const out: Record<string, Agent[]> = {}
  for (const a of Object.values(agentsById)) {
    if (a.departmentId) (out[a.departmentId] ??= []).push(a)
  }
  for (const list of Object.values(out)) list.sort((x, y) => Number(y.isHead) - Number(x.isHead))
  return out
}

/** "error" gồm cả ERROR lẫn BLOCKED (chờ duyệt / bị chặn). */
export function statsOf(agents: Agent[]): DepartmentStats {
  const s: DepartmentStats = { total: agents.length, working: 0, idle: 0, error: 0, offline: 0 }
  for (const a of agents) {
    if (a.status === 'WORKING') s.working++
    else if (a.status === 'IDLE') s.idle++
    else if (a.status === 'OFFLINE') s.offline++
    else s.error++
  }
  return s
}

const EMPTY: Agent[] = []

export function useAgentsByDepartment() {
  const agentsById = useAgentStore((s) => s.agentsById)
  return useMemo(() => groupByDepartment(agentsById), [agentsById])
}

export function useDepartmentStats(departmentId: string): DepartmentStats {
  const byDept = useAgentsByDepartment()
  return useMemo(() => statsOf(byDept[departmentId] ?? EMPTY), [byDept, departmentId])
}

/** Thống kê toàn công ty (thanh trên cùng, dòng "Toàn công ty" ở sidebar). */
export function useCompanyStats(): DepartmentStats {
  const agentsById = useAgentStore((s) => s.agentsById)
  return useMemo(() => statsOf(Object.values(agentsById)), [agentsById])
}
