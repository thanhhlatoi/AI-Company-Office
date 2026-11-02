import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DecisionChip } from '../../components/studio/badges'
import { formatDateTime } from '../../lib/time'
import type { Agent } from '../../types'
import { useToolCalls, useTools } from './queries'

const FILTERS = [['', 'Tất cả'], ['DENIED', 'Bị từ chối'], ['NEEDS_APPROVAL', 'Cần duyệt'], ['ALLOWED', 'Cho phép']] as const

/** Tab "Nhật ký công cụ": mọi lời gọi của agent, lọc theo quyết định, nhảy tới task. Tham số đã được BE che bí mật. */
export function ToolLogTab({ agent }: { agent: Agent }) {
  const [decision, setDecision] = useState<string>('')
  const q = useToolCalls({ agentId: agent.id, decision: decision || undefined })
  const tools = useTools().data ?? []
  const rows = q.data?.pages.flatMap((p) => p.items) ?? []
  return (
    <section aria-label="Nhật ký công cụ" className="space-y-3">
      <div role="group" aria-label="Lọc theo quyết định" className="flex flex-wrap gap-1.5">
        {FILTERS.map(([k, label]) => <button key={k} aria-pressed={decision === k} onClick={() => setDecision(k)} className={`rounded-full border px-3 py-1 text-sm ${decision === k ? 'border-brand bg-blue-50 font-semibold text-brand' : 'border-slate-300 text-slate-700'}`}>{label}</button>)}
      </div>
      {q.isLoading && <div className="h-32 animate-pulse rounded-card bg-slate-200" />}
      {q.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được nhật ký. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>}
      {!q.isLoading && !q.isError && rows.length === 0 && <p className="rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-700">Chưa có lời gọi công cụ nào{decision ? ' ở mục này' : ''}.</p>}
      <ul className="space-y-1.5">
        {rows.map((l) => (
          <li key={l.id} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 72px' }} className="rounded-lg border border-slate-200 p-2 text-sm">
            <div className="flex flex-wrap items-center gap-2"><DecisionChip value={l.decision} /><b>{tools.find((t) => t.id === l.toolId)?.name ?? l.toolId}</b>
              {l.tainted && <span className="rounded bg-orange-100 px-1.5 text-xs font-medium text-orange-950" title="Task đã đọc nội dung từ bên ngoài">nhiễm</span>}
              <span className="ml-auto text-xs text-slate-700">{formatDateTime(l.at)}</span></div>
            <p className="mt-0.5 text-slate-800">{l.reason}</p>
            <p className="mt-0.5 break-all font-mono text-xs text-slate-700">{JSON.stringify(l.args)}</p>
            {l.taskId && <Link to={`/kanban?task=${l.taskId}`} className="text-xs text-brand underline">Mở task #{l.taskId}</Link>}
          </li>
        ))}
      </ul>
      {q.hasNextPage && <button disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()} className="w-full rounded-lg border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">{q.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}</button>}
    </section>
  )
}
