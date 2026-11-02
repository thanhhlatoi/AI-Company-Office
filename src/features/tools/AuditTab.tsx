import { formatDateTime } from '../../lib/time'
import { useAgentStore } from '../../store/agentStore'
import { usePermissionAudit, useTools } from '../studio/queries'

const ACTION = { GRANT: 'Cấp quyền', UPDATE: 'Sửa quyền', REVOKE: 'Thu hồi', KILL_SWITCH: 'Tắt/bật khẩn cấp', ADMIN_FLAG: 'Cờ xác nhận' } as const
const show = (v: unknown) => (v == null ? '—' : JSON.stringify(v))

/** Nhật ký thay đổi quyền (PermissionAudit): ai, lúc nào, trước → sau, lý do. */
export function AuditTab() {
  const q = usePermissionAudit(), tools = useTools().data ?? [], agents = useAgentStore((s) => s.agentsById)
  const rows = q.data?.pages.flatMap((p) => p.items) ?? []
  if (q.isLoading) return <div className="h-40 animate-pulse rounded-card bg-slate-200" />
  if (q.isError) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
  if (!rows.length) return <p className="rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-700">Chưa có thay đổi quyền nào.</p>
  return (
    <section aria-label="Nhật ký thay đổi quyền" className="space-y-2">
      <ul className="space-y-1.5">
        {rows.map((a) => (
          <li key={a.id} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 80px' }} className="rounded-lg border border-slate-200 bg-white p-2 text-sm">
            <p className="flex flex-wrap items-center gap-2"><b>{ACTION[a.action]}</b>{a.toolId && <span>{tools.find((t) => t.id === a.toolId)?.name ?? a.toolId}</span>}{a.agentId && a.agentId !== '*' && <span>· {agents[a.agentId]?.name ?? a.agentId}</span>}<span className="ml-auto text-xs text-slate-700">{a.actor} · {formatDateTime(a.at)}</span></p>
            <p className="mt-0.5 break-all font-mono text-xs text-slate-700">{show(a.before)} → {show(a.after)}</p>
            {a.reason && <p className="mt-0.5 text-xs">Lý do: {a.reason}</p>}
          </li>
        ))}
      </ul>
      {q.hasNextPage && <button disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()} className="w-full rounded-lg border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">Tải thêm</button>}
    </section>
  )
}
