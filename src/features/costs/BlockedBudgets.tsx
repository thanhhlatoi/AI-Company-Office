import { useState } from 'react'
import type { Budget } from '../../types/cost'
import { BudgetForm } from './BudgetForm'
import { BudgetGauge } from './BudgetGauge'
import { SCOPE_LABEL } from './budgetStyle'
import { useBlockedBudgets } from './hooks'

/** Mục "Cần xử lý" cho ngân sách: các ngân sách đang chặn việc, kèm nút "Tăng hạn mức". */
export function BlockedBudgets() {
  const q = useBlockedBudgets()
  const [editing, setEditing] = useState<Budget | null>(null)
  if (q.isLoading) return <div className="h-32 animate-pulse rounded-card bg-slate-200" aria-busy="true" />
  if (q.isError) return <p role="alert" className="text-base text-red-700">Không tải được ngân sách. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
  if (!q.data?.length) return <p className="py-10 text-center text-base text-slate-600">Không có việc nào đang chờ ngân sách.</p>
  return (
    <>
      <ul className="space-y-4">
        {q.data.map((b) => (
          <li key={b.id} className="rounded-card border-2 border-red-300 bg-white p-4">
            <h3 className="text-lg font-semibold">{b.scopeLabel} <span className="text-sm font-normal text-slate-600">({SCOPE_LABEL[b.scopeType]})</span></h3>
            <p className="mb-2 text-base"><b className="text-red-800">{b.waitingTasks} việc</b> đang chờ vì hết ngân sách.</p>
            <BudgetGauge b={b} />
            <button onClick={() => setEditing(b)} className="mt-3 w-full rounded-lg bg-brand px-4 py-3 text-base font-semibold text-white hover:bg-brand-dark">Tăng hạn mức</button>
          </li>
        ))}
      </ul>
      {editing && <BudgetForm budget={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
