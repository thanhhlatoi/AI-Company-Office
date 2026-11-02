import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime, timeAgo } from '../../lib/time'
import { useAgentStore } from '../../store/agentStore'
import { useToolCalls, useTools } from '../studio/queries'
import { groupDenied } from './denied'

/** Trung tâm "Bị từ chối": các lời gọi bị chặn gom theo agent / công cụ / lý do. Nhiều lần tới nhiều đích lạ = nghi bị lừa. */
export function DeniedTab() {
  const q = useToolCalls({ decision: 'DENIED' })
  const tools = useTools().data ?? [], agents = useAgentStore((s) => s.agentsById)
  const calls = q.data?.pages.flatMap((p) => p.items) ?? []
  const groups = groupDenied(calls)
  if (q.isLoading) return <div className="h-48 animate-pulse rounded-card bg-slate-200" />
  if (q.isError) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
  if (!groups.length) return <p className="rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-700">Chưa có lời gọi nào bị chặn. Tốt.</p>
  return (
    <section aria-label="Lời gọi bị từ chối" className="space-y-3">
      <p className="text-sm text-slate-700">{calls.length} lời gọi bị chặn{q.hasNextPage ? ' (mới nhất; còn nữa)' : ''}, gom thành {groups.length} nhóm. Nhóm có <b>nghi bị lừa</b> được đưa lên đầu.</p>
      <ul className="space-y-2">
        {groups.map((g) => {
          const name = agents[g.agentId]?.name ?? g.agentId, tool = tools.find((t) => t.id === g.toolId)?.name ?? g.toolId
          return (
            <li key={g.key} className={`rounded-card border p-3 text-sm ${g.suspicious ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <b>{name}</b><span>→ {tool}</span><span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-900">{g.count} lần</span>
                {g.suspicious && <span className="inline-flex items-center gap-1 rounded-full bg-orange-200 px-2 py-0.5 text-xs font-bold text-orange-950"><ShieldAlert size={12} aria-hidden />Nghi bị lừa: nhiều lần bị chặn tới đích lạ</span>}
                <span className="ml-auto text-xs text-slate-700" title={formatDateTime(g.lastAt)}>gần nhất {timeAgo(g.lastAt)}</span>
              </div>
              <p className="mt-1">{g.reason}</p>
              {g.targets.length > 0 && <p className="mt-1 break-all text-xs text-slate-700">Đích: {g.targets.join(', ')}</p>}
              <p className="mt-1 flex flex-wrap gap-3 text-xs"><Link className="text-brand underline" to={`/agents/${g.agentId}/studio?tab=log`}>Nhật ký của agent</Link><Link className="text-brand underline" to={`/agents/${g.agentId}/studio?tab=tools`}>Sửa quyền</Link>{g.taskIds[0] && <Link className="text-brand underline" to={`/kanban?task=${g.taskIds[0]}`}>Mở task #{g.taskIds[0]}</Link>}</p>
            </li>
          )
        })}
      </ul>
      {q.hasNextPage && <button disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()} className="w-full rounded-lg border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">{q.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}</button>}
    </section>
  )
}
