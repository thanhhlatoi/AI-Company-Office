import { Link } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { useMoney } from '../../lib/useMoney'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import type { StatsOverview } from '../../types/stats'
import { HelpTip } from '../projects/ProjectParts'

const OVERLOAD = { util: 0.85, queue: 5 } // tỉ lệ sử dụng > 85% KÈM hàng đợi dài mới cảnh báo

/** Bảng "Agent bận nhất": bấm tên để mở panel agent. */
export function BusiestAgents({ rows }: { rows: StatsOverview['busiestAgents'] }) {
  const agents = useAgentStore((s) => s.agentsById)
  const depts = useDepartmentStore((s) => s.departmentsById)
  const money = useMoney()
  return (
    <section aria-label="Agent bận nhất" className="rounded-card border border-slate-200 bg-white p-4">
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">Agent bận nhất <HelpTip text="Tỉ lệ sử dụng = phần thời gian agent có việc đang chạy trong khoảng. Độ sâu hàng đợi = số task đang chờ chạy của agent. Gắn 'Có thể quá tải' khi sử dụng > 85% và hàng đợi từ 5 task trở lên." /></h2>
      {rows.length === 0 ? <p className="text-sm text-slate-600">Chưa đủ dữ liệu.</p> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-600"><th className="py-2 pr-2">Agent</th><th className="px-2">Phòng</th><th className="px-2 text-right">Task</th><th className="px-2">Sử dụng</th><th className="px-2 text-right">Hàng đợi</th><th className="px-2 text-right">Tỉ lệ lỗi</th><th className="px-2 text-right">Chi phí</th></tr></thead>
          <tbody>{rows.map((r) => {
            const a = agents[r.agentId]
            const over = r.utilization > OVERLOAD.util && r.queueDepth >= OVERLOAD.queue
            return (
              <tr key={r.agentId} className="border-b border-slate-100">
                <th scope="row" className="py-2 pr-2 text-left font-medium"><Link to={`/agents/${r.agentId}`} className="flex items-center gap-2 underline-offset-2 hover:underline"><Avatar name={a?.name ?? '?'} color={a?.color ?? '#94a3b8'} size={20} />{a?.name ?? `Agent ${r.agentId}`}</Link></th>
                <td className="px-2 text-slate-700">{a?.departmentId ? depts[a.departmentId]?.name : '—'}</td>
                <td className="px-2 text-right tabular-nums">{r.tasks}</td>
                <td className="px-2"><div className="flex items-center gap-2"><div role="progressbar" aria-label={`Sử dụng ${a?.name ?? ''}`} aria-valuenow={Math.round(r.utilization * 100)} aria-valuemin={0} aria-valuemax={100} className="h-2 w-24 rounded-full bg-slate-200"><div className="h-2 rounded-full" style={{ width: `${r.utilization * 100}%`, background: over ? '#b91c1c' : '#1d4ed8' }} /></div><span className="tabular-nums">{Math.round(r.utilization * 100)}%</span>{over && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-900">Có thể quá tải</span>}</div></td>
                <td className="px-2 text-right tabular-nums">{r.queueDepth}</td><td className="px-2 text-right tabular-nums">{(r.errorRate * 100).toFixed(1)}%</td><td className="px-2 text-right tabular-nums">{money(r.costMicro)}</td>
              </tr>
            )
          })}</tbody>
        </table></div>
      )}
    </section>
  )
}
