import { lazy, Suspense, useMemo } from 'react'
import { presetRange } from '../../lib/range'
import { useMoney } from '../../lib/useMoney'
import type { Project } from '../../types/project'
import { useUsage } from '../costs/hooks'
import { stackSeries } from '../costs/stack'
import { BudgetBar } from './ProjectParts'

const StackedBars = lazy(() => import('../charts/StackedBars'))

/** Tab Chi phí: theo ngày (xếp chồng theo agent) + theo agent + ngân sách của dự án. */
export function CostTab({ project: p }: { project: Project }) {
  const money = useMoney()
  const range = useMemo(() => presetRange('30d'), [])
  const q = useUsage(range, 'agent', { projectId: p.id })
  const u = q.data
  const stack = u ? stackSeries(u) : null
  return (
    <div className="space-y-6">
      <section className="rounded-card border border-slate-200 bg-white p-4"><h3 className="mb-2 text-base font-semibold">Ngân sách dự án</h3><BudgetBar cost={p.costMicro} budget={p.budgetMicro} /></section>
      {q.isLoading && <div className="h-64 animate-pulse rounded-card bg-slate-200" aria-busy="true" />}
      {q.isError && <p role="alert" className="text-sm text-red-700">Không tải được chi phí. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>}
      {u && u.unpricedCalls > 0 && <p role="status" className="rounded-card bg-amber-100 px-3 py-2 text-sm text-amber-900">{u.unpricedCalls} cuộc gọi chưa có giá: chi phí thực tế cao hơn con số đang hiện.</p>}
      {u && (u.totalMicro === 0 ? <p className="text-sm text-slate-600">Dự án chưa phát sinh chi phí trong 30 ngày qua.</p> : (
        <>
          <section aria-label="Chi phí theo ngày"><h3 className="mb-2 text-base font-semibold">Chi phí theo ngày (30 ngày, theo agent)</h3>
            <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-slate-200" />}><StackedBars data={stack?.data ?? []} series={stack?.series ?? []} format={money} ariaLabel={`Chi phí dự án theo ngày, tổng ${money(u.totalMicro)}`} /></Suspense></section>
          <section aria-label="Chi phí theo agent"><h3 className="mb-2 text-base font-semibold">Theo agent</h3>
            <ul className="space-y-1.5">{u.rows.map((r) => (
              <li key={r.key} className="grid grid-cols-[10rem_1fr_6rem] items-center gap-2 text-sm"><span className="truncate">{r.label}</span>
                <div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-sky-700" style={{ width: `${(r.totalMicro / u.totalMicro) * 100}%` }} /></div><b className="text-right tabular-nums">{money(r.totalMicro)}</b></li>))}</ul></section>
        </>
      ))}
    </div>
  )
}
