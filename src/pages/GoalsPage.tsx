import { Plus } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBanner } from '../components/ErrorBanner'
import { GoalProgress } from '../features/goals/GoalProgress'
import { PlanReview } from '../features/goals/PlanReview'
import { progressOf, useGoalList, useGoalTasks } from '../features/goals/hooks'
import { GOAL_STYLE } from '../features/goals/style'
import { loadSnapshot } from '../realtime/eventSync'
import { useUiStore } from '../store/uiStore'
import { useWorkStore } from '../store/workStore'
import type { Goal } from '../types'

function GoalItem({ goal, active }: { goal: Goal; active: boolean }) {
  const { pct } = progressOf(goal, useGoalTasks(goal.id))
  const st = GOAL_STYLE[goal.status]
  return (
    <li>
      <Link to={`/goals/${goal.id}`} aria-current={active ? 'page' : undefined}
        className={`block rounded-card border p-3 hover:bg-slate-50 ${active ? 'border-brand bg-brand/5' : 'border-slate-200 bg-white'}`}>
        <div className="truncate font-semibold">{goal.title}</div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: st.soft, color: st.color }}>{st.label}</span>
          <span className="tabular-nums text-slate-600">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-green-600" style={{ width: `${pct}%` }} /></div>
      </Link>
    </li>
  )
}

function Detail({ goal }: { goal: Goal }) {
  return (
    <div className="space-y-4 p-4 pb-24 sm:p-6 sm:pb-24">
      <header>
        <h1 className="text-2xl font-bold">{goal.title}</h1>
        {goal.description && <p className="mt-1 whitespace-pre-wrap text-base text-slate-600">{goal.description}</p>}
      </header>
      {goal.status === 'PLANNING' && <p role="status" className="rounded-card bg-violet-50 px-4 py-3 text-base text-violet-900"><span className="mr-2 inline-block size-3 animate-pulse rounded-full bg-violet-500 align-middle" />Trưởng phòng đang lập kế hoạch…</p>}
      {goal.status === 'AWAITING_PLAN_APPROVAL' && <PlanReview goal={goal} />}
      {goal.status === 'REJECTED' && <p role="status" className="rounded-card bg-slate-100 px-4 py-3 text-base"><b>Kế hoạch đã bị từ chối.</b>{goal.rejectReason && <> Lý do: {goal.rejectReason}</>}</p>}
      {goal.status !== 'PLANNING' && goal.status !== 'AWAITING_PLAN_APPROVAL' && goal.status !== 'REJECTED' && <GoalProgress goal={goal} />}
    </div>
  )
}

/** /goals và /goals/:id — danh sách mục tiêu + (duyệt kế hoạch | tiến độ). */
export default function GoalsPage() {
  const { id } = useParams()
  const goals = useGoalList()
  const sync = useWorkStore((s) => s.sync)
  const goal = goals.find((g) => g.id === id)
  const loading = sync === 'loading' && goals.length === 0
  const openComposer = () => useUiStore.getState().openComposer()
  return (
    <div className="flex h-full flex-col">
      {!goal && <h1 className="sr-only">Mục tiêu</h1>}
      {sync === 'error' && <ErrorBanner message="Không tải được danh sách mục tiêu." onRetry={() => void loadSnapshot()} />}
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Danh sách mục tiêu" className={`w-full shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3 md:w-72 ${id ? 'hidden md:block' : ''}`}>
          <button onClick={openComposer} className="mb-3 flex w-full items-center justify-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"><Plus size={16} /> Mục tiêu mới</button>
          {loading && Array.from({ length: 3 }, (_, i) => <div key={i} className="mb-2 h-20 animate-pulse rounded-card bg-slate-200" />)}
          {!loading && goals.length === 0 && <p className="py-8 text-center text-sm text-slate-600">Chưa có mục tiêu nào.<br />Bấm "Mục tiêu mới" hoặc phím G.</p>}
          <ul className="space-y-2">{goals.map((g) => <GoalItem key={g.id} goal={g} active={g.id === id} />)}</ul>
        </nav>
        <section aria-label="Chi tiết mục tiêu" className={`min-w-0 flex-1 overflow-y-auto ${id ? '' : 'hidden md:block'}`}>
          {id && <Link to="/goals" className="inline-block px-4 pt-3 text-sm text-brand underline md:hidden">← Danh sách</Link>}
          {goal ? <Detail key={goal.id} goal={goal} />
            : id && !loading ? <p className="p-6 text-slate-600">Không tìm thấy mục tiêu này.</p>
            : <p className="p-6 text-slate-600">{loading ? 'Đang tải…' : 'Chọn một mục tiêu để xem tiến độ.'}</p>}
        </section>
      </div>
    </div>
  )
}
