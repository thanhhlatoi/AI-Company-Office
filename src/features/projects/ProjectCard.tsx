import { Link } from 'react-router-dom'
import { useDepartmentStore } from '../../store/departmentStore'
import type { Project } from '../../types/project'
import { BudgetBar, DueLabel, HelpTip, ProgressRing, StatusBar } from './ProjectParts'
import { PROGRESS_HELP, totalTasks } from './util'

/** Thẻ dự án trong danh sách. */
export function ProjectCard({ p }: { p: Project }) {
  const dept = useDepartmentStore((s) => (p.departmentId ? s.departmentsById[p.departmentId] : undefined))
  const empty = totalTasks(p) === 0 && p.goalIds.length === 0
  return (
    <li className="relative rounded-card border border-slate-200 bg-white p-4 shadow-card" style={{ borderLeft: `6px solid ${p.color}` }}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold"><Link to={`/projects/${p.id}`} className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-brand">{p.name}</Link></h2>
          <p className="truncate text-sm text-slate-600">{dept?.name ?? 'Không thuộc phòng'}{p.status === 'ARCHIVED' && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">Đã lưu trữ</span>}</p>
          {empty && <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Chưa có kế hoạch</span>}
        </div>
        <div className="relative z-10 flex flex-col items-center gap-1"><ProgressRing pct={p.progressPct} /><HelpTip text={PROGRESS_HELP} /></div>
      </div>
      <div className="mt-3 space-y-3"><StatusBar counts={p.counts} /><BudgetBar cost={p.costMicro} budget={p.budgetMicro} /><DueLabel project={p} /></div>
    </li>
  )
}
