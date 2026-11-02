import { lazy, Suspense } from 'react'
import { useUiStore } from '../../store/uiStore'
import type { Project } from '../../types/project'
import { GoalsSection } from './GoalsSection'
import { useProjectSnapshots } from './hooks'
import { BudgetBar, DueLabel, HelpTip, ProgressRing, StatusBar } from './ProjectParts'
import { PROGRESS_HELP } from './util'

const ProgressLine = lazy(() => import('../charts/ProgressLine')) // biểu đồ nạp lười: chỉ tải khi mở tab này

/** Tab Tổng quan: tiến độ lớn, đường tiến độ theo ngày, lỗi / chờ duyệt, chi phí, mục tiêu. */
export function OverviewTab({ project: p, onShowTasks }: { project: Project; onShowTasks: () => void }) {
  const snaps = useProjectSnapshots(p.id)
  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-card border border-slate-200 bg-white p-4 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-1"><ProgressRing pct={p.progressPct} size={128} /><span className="flex items-center gap-1 text-xs text-slate-600">Tiến độ <HelpTip text={PROGRESS_HELP} /></span></div>
        <div className="space-y-3"><StatusBar counts={p.counts} /><BudgetBar cost={p.costMicro} budget={p.budgetMicro} /><DueLabel project={p} />
          <div className="flex flex-wrap gap-2">
            <button onClick={onShowTasks} className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-left text-sm"><b className="text-lg tabular-nums text-red-700">{p.counts.failed}</b> task lỗi <span className="block text-xs text-red-800">Hiển thị riêng, không bị ẩn. Bấm để xem.</span></button>
            <button onClick={() => useUiStore.getState().openInbox()} className="rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm"><b className="text-lg tabular-nums text-amber-800">{p.counts.awaitingApproval}</b> chờ duyệt <span className="block text-xs text-amber-900">Mở hộp thư phê duyệt</span></button>
          </div>
        </div>
      </section>
      <section aria-label="Tiến độ theo ngày"><h3 className="mb-2 text-base font-semibold">Tiến độ theo ngày</h3>
        {snaps.isLoading && <div className="h-56 animate-pulse rounded-card bg-slate-200" aria-busy="true" />}
        {snaps.isError && <p role="alert" className="text-sm text-red-700">Không tải được đường tiến độ. <button className="underline" onClick={() => void snaps.refetch()}>Thử lại</button></p>}
        {snaps.data && (snaps.data.length < 2 ? <p className="text-sm text-slate-600">Chưa đủ dữ liệu để vẽ đường tiến độ.</p> : <Suspense fallback={<div className="h-56 animate-pulse rounded-card bg-slate-200" />}><ProgressLine data={snaps.data} /></Suspense>)}
      </section>
      <GoalsSection project={p} />
    </div>
  )
}
