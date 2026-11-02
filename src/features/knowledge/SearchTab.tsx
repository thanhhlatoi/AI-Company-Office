import { useState } from 'react'
import { useUiStore } from '../../store/uiStore'
import { useAgentStore } from '../../store/agentStore'
import { Hl } from '../history/highlight'
import { useSearch } from '../studio/queries'

/** Tìm thử với tư cách một agent (hoặc Quản trị): kết quả có điểm vector / từ khoá / hợp nhất, nguồn bấm được. */
export function SearchTab({ collectionId }: { collectionId: string }) {
  const agents = Object.values(useAgentStore((s) => s.agentsById))
  const [text, setText] = useState(''), [q, setQ] = useState(''), [asAgent, setAsAgent] = useState(''), [scores, setScores] = useState(true)
  const r = useSearch(collectionId, q, asAgent || undefined)
  const who = asAgent ? agents.find((a) => a.id === asAgent)?.name ?? asAgent : 'Quản trị'
  return (
    <section aria-label="Tìm thử" className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); setQ(text.trim()) }} className="flex flex-wrap items-end gap-2 text-sm">
        <label className="min-w-56 flex-1">Câu hỏi<input value={text} onChange={(e) => setText(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-1.5" placeholder="vd: hoàn tiền trong bao nhiêu ngày" /></label>
        <label>Tìm với tư cách<select value={asAgent} onChange={(e) => setAsAgent(e.target.value)} className="mt-0.5 block rounded-lg border border-slate-300 px-2 py-1.5"><option value="">Quản trị (thấy hết)</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <button type="submit" disabled={text.trim().length < 2} className="rounded-lg bg-brand px-4 py-1.5 text-white hover:bg-brand-dark disabled:opacity-50">Tìm</button>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={scores} onChange={(e) => setScores(e.target.checked)} />Hiện điểm</label>
      </form>
      {r.isFetching && <div className="h-16 animate-pulse rounded-card bg-slate-200" />}
      {r.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Tìm thất bại. <button className="underline" onClick={() => void r.refetch()}>Thử lại</button></p>}
      {!q && <p className="rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-700">Nhập câu hỏi để xem agent sẽ nhận được những đoạn nào.</p>}
      {r.data && !r.isFetching && !r.data.visible && <p role="status" className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-950"><b>{who}</b> không thấy bộ sưu tập này: agent chưa được cấp quyền đọc. Kết quả tìm của agent là trống, không phải “không có tài liệu khớp”.</p>}
      {r.data?.visible && !r.isFetching && r.data.hits.length === 0 && <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Không có đoạn nào khớp với “{q}” (với tư cách {who}).</p>}
      <ol className="space-y-2">
        {r.data?.visible && !r.isFetching && r.data.hits.map((h) => (
          <li key={h.chunkId} className="rounded-card border border-slate-200 bg-white p-3 text-sm">
            <p className="mb-1 flex flex-wrap items-center gap-2 text-xs"><button onClick={() => useUiStore.getState().toast(`Mock: mở “${h.documentName}”${h.page ? ` trang ${h.page}` : ''}`)} className="font-semibold text-brand underline">{h.documentName}{h.page != null ? ` · trang ${h.page}` : ''}</button>
              {scores && <span className="ml-auto font-mono text-slate-700">vector {h.score.vector?.toFixed(2) ?? '—'} · từ khoá {h.score.keyword?.toFixed(2) ?? '—'} · <b>hợp nhất {h.score.fused.toFixed(2)}</b></span>}</p>
            <p className="break-words"><Hl text={h.text} q={q} /></p>
          </li>
        ))}
      </ol>
    </section>
  )
}
