import { useEffect } from 'react'
import { useAgentStore } from '../../store/agentStore'
import { useBudgetStore } from '../../store/budgetStore'
import { useBudgets } from './hooks'

/** Agent nào đang bị ngân sách (cả công ty / phòng / chính agent, chế độ chặn, hết hạn mức) chặn. Gọi 1 lần ở gốc app. */
export function useBudgetSync() {
  const budgets = useBudgets().data
  const agents = useAgentStore((s) => s.agentsById)
  useEffect(() => {
    const hard = (budgets ?? []).filter((b) => b.mode === 'BLOCK' && b.state === 'HARD')
    useBudgetStore.getState().set(Object.values(agents).filter((a) => hard.some((b) => b.scopeType === 'COMPANY' || (b.scopeType === 'AGENT' && b.scopeId === a.id) || (b.scopeType === 'DEPARTMENT' && b.scopeId === a.departmentId))).map((a) => a.id))
  }, [budgets, agents])
}
