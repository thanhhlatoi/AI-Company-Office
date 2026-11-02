import { Link } from 'react-router-dom'
import { timeAgo } from '../../lib/time'
import { useAgentStore } from '../../store/agentStore'
import type { StatsOverview } from '../../types/stats'
import { HelpTip } from '../projects/ProjectParts'

/** "Lỗi hay gặp": nhóm theo nội dung lỗi, số lần, agent liên quan, ví dụ gần nhất và lối nhảy tới task. */
export function ErrorGroups({ groups }: { groups: StatsOverview['errorGroups'] }) {
  const agents = useAgentStore((s) => s.agentsById)
  return (
    <section aria-label="Lỗi hay gặp" className="rounded-card border border-slate-200 bg-white p-4">
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">Lỗi hay gặp <HelpTip text="Gom các task lỗi hẳn trong khoảng theo nội dung lỗi, xếp theo số lần giảm dần." /></h2>
      {groups.length === 0 ? <p className="text-sm text-slate-600">Không có task lỗi nào trong khoảng này.</p> : (
        <ul className="divide-y divide-slate-100">{groups.map((g) => (
          <li key={g.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold tabular-nums text-red-900">{g.count} lần</span>
            <span className="min-w-0 flex-1 font-medium">{g.message}</span>
            <span className="text-xs text-slate-600">{g.agentIds.slice(0, 3).map((id) => agents[id]?.name ?? id).join(', ')}{g.agentIds.length > 3 ? ` +${g.agentIds.length - 3}` : ''} · gần nhất {timeAgo(g.lastAt)}</span>
            {g.lastTaskId && <Link to={`/kanban?task=${g.lastTaskId}`} className="text-xs font-medium text-brand underline">Xem task</Link>}
          </li>))}
        </ul>
      )}
    </section>
  )
}
