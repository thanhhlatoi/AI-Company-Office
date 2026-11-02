import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getUsage, listBudgetChanges, listBudgets, listModelPrices, postBudget, postModelPrice, putBudget, type Range } from '../../api/biz'
import { useUiStore } from '../../store/uiStore'
import type { Budget, BudgetUpdate, UsageGroupBy } from '../../types/cost'

export const useUsage = (r: Range, groupBy: UsageGroupBy, f: { projectId?: string; agentId?: string } = {}) => useQuery({ queryKey: ['usage', r, groupBy, f], queryFn: () => getUsage(r, groupBy, f) })
export const useModelPrices = () => useQuery({ queryKey: ['model-prices'], queryFn: listModelPrices })
/** Ngân sách; tải lại mỗi 30 giây và ngay khi nhận budget.updated (xem realtime/dispatch.ts). */
export const useBudgets = () => useQuery({ queryKey: ['budgets'], queryFn: listBudgets, refetchInterval: 30_000 })
export const useBudgetChanges = (id: string, enabled: boolean) => useQuery({ queryKey: ['budgets', id, 'changes'], queryFn: () => listBudgetChanges(id), enabled })
/** Ngân sách đang CHẶN việc (hết hạn mức, chế độ BLOCK) và có task đang chờ: những mục cần chủ xử lý. */
export const useBlockedBudgets = () => useQuery({ queryKey: ['budgets'], queryFn: listBudgets, refetchInterval: 30_000, select: (l: Budget[]) => l.filter((b) => b.mode === 'BLOCK' && b.state === 'HARD' && b.waitingTasks > 0) })

const toast = (t: string, k?: 'success' | 'error') => useUiStore.getState().toast(t, k)
function useRefresh() {
  const qc = useQueryClient()
  return () => { for (const k of ['budgets', 'usage', 'kanban', 'projects']) void qc.invalidateQueries({ queryKey: [k] }) } // tăng hạn mức có thể thả các task đang chờ ngân sách
}
export function useCreateBudget() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: postBudget, onSuccess: () => { toast('Đã tạo ngân sách'); refresh() } })
}
export function useUpdateBudget() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: ({ id, update }: { id: string; update: BudgetUpdate }) => putBudget(id, update), onSuccess: () => { toast('Đã lưu ngân sách'); refresh() } })
}
export function useAddPrice() {
  const refresh = useRefresh()
  const qc = useQueryClient()
  return useMutation({ mutationFn: postModelPrice, onSuccess: () => { toast('Đã thêm giá model'); void qc.invalidateQueries({ queryKey: ['model-prices'] }); refresh() } })
}
