import { RefreshCw } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { ErrorBanner } from '../components/ErrorBanner'
import { useDepartmentStore } from '../store/departmentStore'
import { useSearchParams } from 'react-router-dom'
import { RangePicker } from '../features/costs/RangePicker'
import { useCostFilters } from '../features/costs/useCostFilters'
import { useProjects } from '../features/projects/hooks'
import { BusiestAgents } from '../features/stats/BusiestAgents'
import { DashKpis } from '../features/stats/DashKpis'
import { ErrorGroups } from '../features/stats/ErrorGroups'
import { Heatmap } from '../features/stats/Heatmap'
import { useStatsOverview } from '../features/stats/hooks'

const DashCharts = lazy(() => import('../features/charts/DashCharts'))
const SEL = 'min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm'
const TIME = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

/** /dashboard — thống kê vận hành. Tự làm mới 30 giây hoặc khi có stats.invalidated. */
export default function DashboardPage() {
  const f = useCostFilters()
  const [sp, setSp] = useSearchParams()
  const depts = Object.values(useDepartmentStore((s) => s.departmentsById)).sort((a, b) => a.order - b.order)
  const projects = useProjects({}).data ?? []
  const q = useStatsOverview(f.range, { departmentId: sp.get('dept') ?? undefined, projectId: sp.get('project') ?? undefined })
  const s = q.data
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }) }
  return (
    <div className="mx-auto h-full max-w-7xl space-y-5 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24">
      <header className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="ml-auto flex items-center gap-1.5 text-xs text-slate-600" role="status"><RefreshCw size={12} className={q.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />{s ? `Cập nhật lúc ${TIME.format(new Date(s.updatedAt))}` : 'Đang tải…'} · tự làm mới mỗi 30 giây</p></header>
      <div className="flex flex-wrap items-center gap-2"><RangePicker groups={false} />
        <select aria-label="Phòng ban" value={sp.get('dept') ?? ''} onChange={(e) => set('dept', e.target.value)} className={SEL}><option value="">Mọi phòng</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select aria-label="Dự án" value={sp.get('project') ?? ''} onChange={(e) => set('project', e.target.value)} className={SEL}><option value="">Mọi dự án</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      {q.isError && <ErrorBanner message="Không tải được số liệu dashboard." onRetry={() => void q.refetch()} />}
      {q.isLoading && <div className="space-y-4" aria-busy="true"><div className="grid gap-3 sm:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-card bg-slate-200" />)}</div><div className="h-64 animate-pulse rounded-card bg-slate-200" /></div>}
      {s && <DashKpis s={s} />}
      {s && !s.enoughData && <p role="status" className="rounded-card border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-700"><b>Chưa đủ dữ liệu</b> trong khoảng này (cần ít nhất 5 task kết thúc) nên chưa vẽ biểu đồ. Hãy chọn khoảng dài hơn hoặc bỏ bớt bộ lọc.</p>}
      {s?.enoughData && (
        <>
          <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-slate-200" aria-busy="true" />}><DashCharts byDay={s.byDay} buckets={s.durationBuckets} costDept={s.costByDepartment} /></Suspense>
          <BusiestAgents rows={s.busiestAgents} />
          <ErrorGroups groups={s.errorGroups} />
          {s.heatmap && <Heatmap data={s.heatmap} />}
        </>
      )}
    </div>
  )
}
