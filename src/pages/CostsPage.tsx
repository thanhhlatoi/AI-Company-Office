import { Plus } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBanner } from '../components/ErrorBanner'
import { useMoney } from '../lib/useMoney'
import { BudgetCard } from '../features/costs/BudgetCard'
import { BudgetForm } from '../features/costs/BudgetForm'
import { CostKpis } from '../features/costs/CostKpis'
import { useBudgets, useUsage } from '../features/costs/hooks'
import { RangePicker } from '../features/costs/RangePicker'
import { RankingTable } from '../features/costs/RankingTable'
import { stackSeries } from '../features/costs/stack'
import { GROUP_LABEL, useCostFilters } from '../features/costs/useCostFilters'

const StackedBars = lazy(() => import('../features/charts/StackedBars'))

/** /costs — chi phí theo kỳ và nhóm, bảng xếp hạng, ngân sách. */
export default function CostsPage() {
  const f = useCostFilters()
  const money = useMoney()
  const q = useUsage(f.range, f.by)
  const budgets = useBudgets()
  const [creating, setCreating] = useState(false)
  const u = q.data
  const stack = u ? stackSeries(u) : null
  return (
    <div className="mx-auto h-full max-w-6xl space-y-6 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24">
      <header className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold">Chi phí và ngân sách</h1><Link to="/costs/prices" className="ml-auto text-sm text-brand underline">Bảng giá model →</Link></header>
      <RangePicker />
      {q.isError && <ErrorBanner message="Không tải được số liệu chi phí." onRetry={() => void q.refetch()} />}
      {u && u.unpricedCalls > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-card bg-yellow-300 px-4 py-2 text-sm font-medium text-yellow-950">
          <span>{u.unpricedCalls} cuộc gọi chưa có giá, chi phí đang thấp hơn thực tế.</span><Link to="/costs/prices" className="rounded-lg bg-yellow-950 px-3 py-1 text-xs font-bold text-yellow-50">Nhập giá model</Link>
        </div>
      )}
      {q.isLoading && <div className="space-y-4" aria-busy="true"><div className="grid gap-3 sm:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-card bg-slate-200" />)}</div><div className="h-64 animate-pulse rounded-card bg-slate-200" /></div>}
      {u && <CostKpis u={u} />}
      {u && (u.calls === 0 ? <p className="rounded-card border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Không có cuộc gọi nào trong khoảng thời gian này. Hãy chọn khoảng dài hơn.</p> : (
        <>
          <section aria-label="Chi phí theo ngày"><h2 className="mb-2 text-base font-semibold">Chi phí theo ngày (theo {GROUP_LABEL[f.by].toLowerCase()})</h2>
            {stack && <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-slate-200" />}><StackedBars data={stack.data} series={stack.series} format={money} ariaLabel={`Chi phí theo ngày, tổng ${money(u.totalMicro)}`} /></Suspense>}</section>
          <RankingTable u={u} groupLabel={GROUP_LABEL[f.by]} />
        </>
      ))}
      <section aria-label="Ngân sách" className="space-y-3">
        <div className="flex items-center"><h2 className="text-base font-semibold">Ngân sách</h2><button onClick={() => setCreating(true)} className="ml-auto flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"><Plus size={14} /> Ngân sách mới</button></div>
        {budgets.isError && <ErrorBanner message="Không tải được ngân sách." onRetry={() => void budgets.refetch()} />}
        {budgets.isLoading && <div className="h-28 animate-pulse rounded-card bg-slate-200" aria-busy="true" />}
        {budgets.data?.length === 0 && <p className="rounded-card border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">Chưa có ngân sách nào. Đặt hạn mức theo ngày/tháng cho công ty, phòng ban, dự án hoặc từng agent để tránh chi quá tay.</p>}
        <ul className="space-y-3">{budgets.data?.map((b) => <BudgetCard key={b.id} b={b} />)}</ul>
      </section>
      {creating && <BudgetForm onClose={() => setCreating(false)} />}
    </div>
  )
}
