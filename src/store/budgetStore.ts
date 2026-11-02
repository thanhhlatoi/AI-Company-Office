import { create } from 'zustand'

/** Id agent đang bị chặn vì hết ngân sách (cho huy hiệu trên canvas). Nguồn: query ngân sách, đồng bộ ở features/costs/useBudgetSync.ts. */
interface BudgetState { blocked: string; set: (ids: string[]) => void }
export const useBudgetStore = create<BudgetState>((set) => ({ blocked: '', set: (ids) => set({ blocked: [...ids].sort().join(',') }) }))
export const isBlockedAgent = (key: string, agentId: string) => key.split(',').includes(agentId)
