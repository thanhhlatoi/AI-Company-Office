import { Download } from 'lucide-react'
import { useState } from 'react'
import { getMemoryExport } from '../../api/memory'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { useAgentStore } from '../../store/agentStore'
import { useUiStore } from '../../store/uiStore'
import type { MemoryNamespace } from '../../types/memory'
import { download } from '../history/exportConv'
import { useNamespaces } from '../studio/queries'
import { useForget, useForgetPreview, useSaveNamespace } from './mutations'

const inp = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm'

function Forget() {
  const agents = Object.values(useAgentStore((s) => s.agentsById)), nss = useNamespaces().data ?? []
  const [subject, setSubject] = useState(''), [agentId, setAgentId] = useState(''), [ask, setAsk] = useState(false)
  const preview = useForgetPreview(), forget = useForget()
  const body = { subject: subject.trim(), agentId: agentId || undefined }
  const data = preview.data
  return (
    <section aria-label="Quên về một chủ thể" className="space-y-2 rounded-card border border-slate-200 p-3 text-sm">
      <h3 className="font-semibold">Quên về…</h3>
      <p className="text-slate-700">Xoá mọi ký ức có chủ thể khớp (ví dụ một khách hàng đã yêu cầu xoá dữ liệu). Luôn xem trước số mục sẽ xoá.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1">Chủ thể<input value={subject} onChange={(e) => { setSubject(e.target.value); preview.reset() }} className={`${inp} mt-0.5 block w-full`} placeholder="vd: Khách Việt" /></label>
        <label>Giới hạn ở agent<select value={agentId} onChange={(e) => { setAgentId(e.target.value); preview.reset() }} className={`${inp} mt-0.5 block`}><option value="">Mọi agent</option>{agents.filter((a) => nss.some((n) => n.agentId === a.id)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <button disabled={subject.trim().length < 2 || preview.isPending} onClick={() => preview.mutate(body)} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50">Xem trước</button></div>
      {data && (data.count === 0 ? <p role="status" className="rounded-lg bg-slate-50 p-2">Không có ký ức nào khớp “{subject}”.</p> : (
        <div role="status" className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-2"><p><b>{data.count}</b> ký ức sẽ bị xoá vĩnh viễn, ví dụ:</p><ul className="list-disc pl-5">{data.samples.map((s, i) => <li key={i} className="break-words">{s}</li>)}</ul>
          <button onClick={() => setAsk(true)} className="rounded-lg bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800">Quên {data.count} ký ức…</button></div>))}
      {ask && data && <TwoStepConfirm title={`Quên về “${subject.trim()}”?`} twoStep askReason={false} confirmLabel="Quên vĩnh viễn" busy={forget.isPending} preview={<p className="text-sm">Xoá vĩnh viễn <b>{data.count}</b> ký ức về “{subject.trim()}”{agentId ? ` của ${agents.find((a) => a.id === agentId)?.name}` : ' ở mọi agent'}. Không thể hoàn tác.</p>} onClose={() => setAsk(false)} onConfirm={() => forget.mutate(body, { onSuccess: () => { setAsk(false); preview.reset(); setSubject('') } })} />}
    </section>
  )
}

function Export() {
  const agents = Object.values(useAgentStore((s) => s.agentsById)), nss = useNamespaces().data ?? []
  const [agentId, setAgentId] = useState(''), [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try { const d = await getMemoryExport(agentId || undefined); download(`bo-nho-${agentId || 'tat-ca'}.json`, 'application/json', JSON.stringify(d, null, 2)) }
    catch { useUiStore.getState().toast('Không xuất được bộ nhớ, thử lại', 'error') } finally { setBusy(false) }
  }
  return (
    <section aria-label="Xuất bộ nhớ" className="space-y-2 rounded-card border border-slate-200 p-3 text-sm"><h3 className="font-semibold">Xuất bộ nhớ (JSON)</h3>
      <div className="flex flex-wrap items-center gap-2"><select aria-label="Agent cần xuất" value={agentId} onChange={(e) => setAgentId(e.target.value)} className={inp}><option value="">Mọi agent</option>{agents.filter((a) => nss.some((n) => n.agentId === a.id)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <button disabled={busy} onClick={() => void go()} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"><Download size={14} aria-hidden />{busy ? 'Đang xuất…' : 'Xuất JSON'}</button></div></section>
  )
}

function NsRow({ n }: { n: MemoryNamespace }) {
  const [v, setV] = useState({ limit: n.limit, ttlDays: n.ttlDays ?? null, requireReview: n.requireReview }), save = useSaveNamespace()
  const dirty = v.limit !== n.limit || v.ttlDays !== (n.ttlDays ?? null) || v.requireReview !== n.requireReview
  return (
    <tr className="border-t border-slate-100"><th scope="row" className="p-2 text-left font-medium">{n.name}<span className="block text-xs font-normal text-slate-700">{n.itemCount} mục · {n.pendingCount} chờ xem xét</span></th>
      <td className="p-2"><input type="number" min={1} aria-label={`Giới hạn ${n.name}`} value={v.limit} onChange={(e) => setV({ ...v, limit: Math.max(1, Math.floor(Number(e.target.value))) })} className={`${inp} w-24`} /></td>
      <td className="p-2"><input type="number" min={1} aria-label={`TTL ngày ${n.name}`} value={v.ttlDays ?? ''} placeholder="Vĩnh viễn" onChange={(e) => setV({ ...v, ttlDays: e.target.value === '' ? null : Math.max(1, Math.floor(Number(e.target.value))) })} className={`${inp} w-28`} /></td>
      <td className="p-2"><input type="checkbox" aria-label={`Yêu cầu xem xét ${n.name}`} checked={v.requireReview} onChange={(e) => setV({ ...v, requireReview: e.target.checked })} /></td>
      <td className="p-2"><button disabled={!dirty || save.isPending} onClick={() => save.mutate({ id: n.id, c: v })} className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50 disabled:opacity-40">Lưu</button></td></tr>
  )
}

export function ManageTab() {
  const q = useNamespaces()
  return (
    <div className="space-y-5">
      <Forget /><Export />
      <section aria-label="Không gian tên" className="space-y-2"><h3 className="text-sm font-semibold">Cấu hình không gian tên</h3>
        {q.isLoading && <div className="h-24 animate-pulse rounded-card bg-slate-200" />}
        {q.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>}
        {q.data && <div className="overflow-x-auto rounded-card border border-slate-200 bg-white"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr>{['Không gian tên', 'Giới hạn (mục)', 'TTL (ngày)', 'Xem xét khi ghi', ''].map((h) => <th key={h} scope="col" className="p-2 font-semibold">{h}</th>)}</tr></thead><tbody>{q.data.map((n) => <NsRow key={`${n.id}:${n.limit}:${n.ttlDays}:${n.requireReview}`} n={n} />)}</tbody></table></div>}
      </section>
    </div>
  )
}
