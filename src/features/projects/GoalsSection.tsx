import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkStore } from '../../store/workStore'
import type { Goal } from '../../types'
import type { Project } from '../../types/project'
import { progressOf, useGoalTasks } from '../goals/hooks'
import { GOAL_STYLE } from '../goals/style'
import { useAssignGoal } from './hooks'

function GoalRow({ goal, onRemove, busy }: { goal: Goal; onRemove: () => void; busy: boolean }) {
  const tasks = useGoalTasks(goal.id)
  const { done, total, pct } = progressOf(goal, tasks)
  const failed = tasks.filter((t) => t.status === 'FAILED').length
  const st = GOAL_STYLE[goal.status]
  return (
    <li className="rounded-card border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/goals/${goal.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{goal.title}</Link>
        <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: st.soft, color: st.color }}>{st.label}</span>
        <button onClick={onRemove} disabled={busy} className="text-xs text-slate-600 underline disabled:opacity-50">Bỏ khỏi dự án</button>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
        <div role="progressbar" aria-label={`Tiến độ ${goal.title}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 flex-1 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-green-600" style={{ width: `${pct}%` }} /></div>
        <span className="tabular-nums">{done}/{total} việc · {pct}%</span>
        {failed > 0 && <span className="font-bold text-red-700">{failed} lỗi</span>}
      </div>
    </li>
  )
}

/** Mục tiêu của dự án, tiến độ từng mục tiêu, và gán / chuyển một mục tiêu vào dự án. */
export function GoalsSection({ project }: { project: Project }) {
  const goalsById = useWorkStore((s) => s.goalsById)
  const assign = useAssignGoal()
  const [pick, setPick] = useState('')
  const mine = project.goalIds.map((id) => goalsById[id]).filter((g): g is Goal => !!g)
  const others = Object.values(goalsById).filter((g) => !project.goalIds.includes(g.id)).sort((a, b) => a.title.localeCompare(b.title, 'vi'))
  return (
    <section aria-label="Mục tiêu của dự án" className="space-y-3">
      <h3 className="text-base font-semibold">Mục tiêu ({mine.length})</h3>
      {mine.length === 0 && <p className="rounded-card border border-dashed border-slate-300 p-4 text-sm text-slate-600">Dự án chưa có mục tiêu. Chọn một mục tiêu bên dưới để gán vào, hoặc tạo mục tiêu mới (phím G).</p>}
      <ul className="space-y-2">{mine.map((g) => <GoalRow key={g.id} goal={g} busy={assign.isPending} onRemove={() => assign.mutate({ goalId: g.id, projectId: null })} />)}</ul>
      {project.status === 'ACTIVE' && (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Chọn mục tiêu để gán vào dự án" value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-9 min-w-0 max-w-xs flex-1 rounded-lg border border-slate-300 bg-white px-2 text-sm">
            <option value="">Chọn mục tiêu để gán vào dự án…</option>
            {others.map((g) => <option key={g.id} value={g.id}>{g.title}{g.projectId ? ' (đang ở dự án khác, sẽ chuyển sang đây)' : ''}</option>)}
          </select>
          <button disabled={!pick || assign.isPending} onClick={() => assign.mutate({ goalId: pick, projectId: project.id }, { onSuccess: () => setPick('') })} className="min-h-9 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">Gán vào dự án</button>
        </div>
      )}
    </section>
  )
}
