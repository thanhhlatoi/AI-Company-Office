import type { Budget, BudgetChange } from '../../types/cost'
import { mockDb } from '../db'
import { deptOf } from './compute'
import { HOUR } from './rng'
import { NOW, bizTasks, budgetPred, budgets, periodStart, stateOf, sumCalls, type Call } from './seed'

/** Lịch sử thay đổi hạn mức (mới nhất trước). */
export const changes: BudgetChange[] = [{ id: 'ch1', budgetId: 'b2', at: new Date(NOW - 30 * HOUR).toISOString(), fromMicro: 50_000, toMicro: 100_000, reason: 'Tăng hạn mức cho đợt kiểm kê cuối quý' }]

/** Vị từ chọn cuộc gọi / task thuộc phạm vi một ngân sách. */
export const inScope = (b: Pick<Budget, 'scopeType' | 'scopeId'>, agentId: string, projectId?: string | null) =>
  b.scopeType === 'COMPANY' || (b.scopeType === 'AGENT' && agentId === b.scopeId) || (b.scopeType === 'DEPARTMENT' && deptOf(agentId) === b.scopeId) || (b.scopeType === 'PROJECT' && projectId === b.scopeId)
export const scopePred = (b: Pick<Budget, 'scopeType' | 'scopeId'>) => (c: Call) => inScope(b, c.agentId, c.projectId)

/** Ngân sách kèm số liệu TÍNH LẠI mỗi lần đọc (đã dùng, đang đặt chỗ, số task chờ ngân sách, trạng thái). */
export function budgetView(b: Budget): Budget {
  const used = sumCalls(budgetPred.get(b.id) ?? (() => false), periodStart(b.period))
  const mine = bizTasks.filter((t) => inScope(b, t.agentId, t.projectId))
  const v = { ...b, usedMicro: used, reservedMicro: mine.filter((t) => t.status === 'RUNNING' || t.status === 'AWAITING_APPROVAL').length * 20_000, waitingTasks: mine.filter((t) => t.status === 'WAITING_BUDGET').length }
  return { ...v, state: stateOf(v) }
}
export const allBudgets = () => budgets.map(budgetView)
/** Agent đang bị chặn vì ngân sách nào đó hết hạn mức (chế độ BLOCK)? */
export const isBlocked = (agentId: string, projectId?: string | null) => allBudgets().some((b) => b.mode === 'BLOCK' && b.state === 'HARD' && inScope(b, agentId, projectId))
export const agentName = (id: string) => mockDb.agents.find((a) => a.id === id)?.name ?? id
