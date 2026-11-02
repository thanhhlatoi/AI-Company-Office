import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { timeAgo } from '../../lib/time'
import { useAgentStore } from '../../store/agentStore'
import type { MemoryItem } from '../../types/memory'
import { useMemory } from '../studio/queries'
import { OriginBadge } from './OriginBadge'
import { useMemoryActions } from './mutations'
import { EXTERNAL_WARNING } from './style'

function Card({ m, checked, onCheck }: { m: MemoryItem; checked: boolean; onCheck: () => void }) {
  const act = useMemoryActions(), agent = useAgentStore((s) => (m.agentId ? s.agentsById[m.agentId] : undefined))
  const [edit, setEdit] = useState(false), [text, setText] = useState(m.content)
  const ext = m.origin === 'EXTERNAL_INFERRED', busy = act.review.isPending
  return (
    <li className={`rounded-card border-2 bg-white p-3 text-sm ${ext ? 'border-orange-400' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center gap-2"><input type="checkbox" checked={checked} onChange={onCheck} aria-label={`Chọn: ${m.content.slice(0, 40)}`} /><OriginBadge origin={m.origin} />{agent && <span className="text-xs text-slate-700">Agent {agent.name}</span>}<span className="ml-auto text-xs text-slate-700">{timeAgo(m.createdAt)} · tin cậy {Math.round(m.confidence * 100)}%</span></div>
      {ext && <p role="alert" className="mt-2 flex gap-2 rounded-lg bg-orange-50 p-2 text-orange-950"><TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden /><b>{EXTERNAL_WARNING}</b></p>}
      {edit ? <textarea aria-label="Sửa nội dung trước khi duyệt" value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 p-2" /> : <p className="mt-2 break-words text-base">{m.content}</p>}
      {m.subject && <p className="text-xs text-slate-700">Chủ thể: <b>{m.subject}</b></p>}
      <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs"><p className="font-semibold">Nguồn</p>
        {m.source?.taskId ? <p>Sinh ra trong <Link className="text-brand underline" to={`/kanban?task=${m.source.taskId}`}>task #{m.source.taskId}</Link></p> : <p>Không rõ task</p>}
        {m.source?.externalRefs.length ? <><p className="mt-1">Nội dung bên ngoài task đã đọc:</p><ul className="list-disc pl-5">{m.source.externalRefs.map((r) => <li key={r} className="break-all">{r}</li>)}</ul></> : <p>Không đọc nội dung bên ngoài.</p>}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => act.review.mutate({ id: m.id, decision: 'APPROVE', content: edit ? text : undefined })} className="rounded-lg bg-green-700 px-3 py-1.5 font-medium text-white hover:bg-green-800 disabled:opacity-50">{edit ? 'Lưu và duyệt' : 'Duyệt'}</button>
        <button disabled={busy} onClick={() => act.review.mutate({ id: m.id, decision: 'REJECT' })} className="rounded-lg border border-red-400 px-3 py-1.5 font-medium text-red-800 hover:bg-red-50 disabled:opacity-50">Từ chối</button>
        <button onClick={() => { setText(m.content); setEdit((v) => !v) }} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">{edit ? 'Bỏ sửa' : 'Sửa rồi duyệt'}</button></div>
    </li>
  )
}

/** Hàng chờ xem xét: mục PENDING_REVIEW kèm nguồn; mục suy ra từ nội dung ngoài được cảnh báo nổi bật. Duyệt hàng loạt phải xác nhận. */
export function ReviewTab() {
  const q = useMemory({ status: 'PENDING_REVIEW' }), act = useMemoryActions()
  const [sel, setSel] = useState<string[]>([]), [ask, setAsk] = useState<'APPROVE' | 'REJECT' | null>(null)
  const rows = q.data?.pages.flatMap((p) => p.items) ?? []
  const chosen = rows.filter((m) => sel.includes(m.id)), risky = chosen.some((m) => m.origin === 'EXTERNAL_INFERRED')
  if (q.isLoading) return <div className="h-40 animate-pulse rounded-card bg-slate-200" />
  if (q.isError) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được hàng chờ. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
  if (!rows.length) return <p className="rounded-card border border-dashed border-slate-300 p-8 text-center text-sm text-slate-700">Không có ký ức nào đang chờ xem xét.</p>
  return (
    <section aria-label="Hàng chờ xem xét" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm"><label className="flex items-center gap-1.5"><input type="checkbox" checked={sel.length === rows.length} onChange={() => setSel(sel.length === rows.length ? [] : rows.map((m) => m.id))} />Chọn tất cả ({rows.length})</label>
        <button disabled={!sel.length} onClick={() => setAsk('APPROVE')} className="rounded-lg border border-green-700 px-3 py-1 font-medium text-green-900 hover:bg-green-50 disabled:opacity-40">Duyệt {sel.length || ''} mục đã chọn</button>
        <button disabled={!sel.length} onClick={() => setAsk('REJECT')} className="rounded-lg border border-red-400 px-3 py-1 font-medium text-red-800 hover:bg-red-50 disabled:opacity-40">Từ chối {sel.length || ''} mục</button></div>
      <ul className="space-y-3">{rows.map((m) => <Card key={m.id} m={m} checked={sel.includes(m.id)} onCheck={() => setSel((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))} />)}</ul>
      {q.hasNextPage && <button onClick={() => void q.fetchNextPage()} className="w-full rounded-lg border border-slate-300 py-2 text-sm hover:bg-slate-50">Tải thêm</button>}
      {ask && <TwoStepConfirm title={ask === 'APPROVE' ? `Duyệt ${chosen.length} ký ức?` : `Từ chối ${chosen.length} ký ức?`} twoStep={ask === 'APPROVE' && risky} askReason={false} confirmLabel={ask === 'APPROVE' ? 'Duyệt' : 'Từ chối'} busy={act.bulk.isPending}
        preview={<><p className="text-sm">{chosen.length} mục sẽ được {ask === 'APPROVE' ? 'đưa vào bộ nhớ và agent sẽ dùng chúng' : 'bỏ đi'}.</p>{ask === 'APPROVE' && risky && <p className="mt-2 rounded bg-orange-50 p-2 text-sm font-semibold text-orange-950">{chosen.filter((m) => m.origin === 'EXTERNAL_INFERRED').length} mục suy ra từ nội dung bên ngoài. {EXTERNAL_WARNING}</p>}</>}
        onClose={() => setAsk(null)} onConfirm={() => act.bulk.mutate({ ids: sel, decision: ask }, { onSuccess: () => { setSel([]); setAsk(null) } })} />}
    </section>
  )
}
