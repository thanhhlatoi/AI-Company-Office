import { useDeferredValue, useState } from 'react'
import { useAgentStore } from '../../store/agentStore'
import type { MemoryFilters } from '../../api/studio'
import { useMemory, useNamespaces } from '../studio/queries'
import { MemoryRow } from './MemoryRow'
import { ORIGIN_STYLE, KIND_LABEL, STATUS_LABEL } from './style'

const sel = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm'

/** Duyệt ký ức: chọn agent / không gian tên, tìm không dấu, lọc loại / nguồn gốc / trạng thái / chủ thể. */
export function ListTab({ initialAgent }: { initialAgent: string }) {
  const agents = Object.values(useAgentStore((s) => s.agentsById)), nss = useNamespaces().data ?? []
  const [f, setF] = useState<MemoryFilters>({ agentId: initialAgent || undefined, status: '' })
  const [text, setText] = useState('')
  const q = useMemory({ ...f, q: useDeferredValue(text) || undefined, status: f.status || undefined })
  const set = (p: Partial<MemoryFilters>) => setF({ ...f, ...p })
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [], total = q.data?.pages[0]?.total ?? 0
  const withMemory = agents.filter((a) => nss.some((n) => n.agentId === a.id))
  return (
    <section aria-label="Danh sách ký ức" className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label>Agent<select className={`${sel} block`} value={f.agentId ?? ''} onChange={(e) => set({ agentId: e.target.value || undefined, namespaceId: undefined })}><option value="">Tất cả</option>{withMemory.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Không gian tên<select className={`${sel} block`} value={f.namespaceId ?? ''} onChange={(e) => set({ namespaceId: e.target.value || undefined })}><option value="">Tất cả</option>{nss.filter((n) => !f.agentId || n.agentId === f.agentId || !n.agentId).map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
        <label className="min-w-40 flex-1">Tìm (không dấu)<input value={text} onChange={(e) => setText(e.target.value)} className={`${sel} block w-full`} placeholder="vd: khach viet" /></label>
        <label>Loại<select className={`${sel} block`} value={f.kind ?? ''} onChange={(e) => set({ kind: e.target.value || undefined })}><option value="">Tất cả</option>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Nguồn gốc<select className={`${sel} block`} value={f.origin ?? ''} onChange={(e) => set({ origin: e.target.value || undefined })}><option value="">Tất cả</option>{Object.entries(ORIGIN_STYLE).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></label>
        <label>Trạng thái<select className={`${sel} block`} value={f.status ?? ''} onChange={(e) => set({ status: e.target.value })}><option value="">Tất cả</option>{Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Chủ thể<input value={f.subject ?? ''} onChange={(e) => set({ subject: e.target.value || undefined })} className={`${sel} block w-36`} placeholder="vd: Khách Việt" /></label>
        <label className="flex items-center gap-1.5 pb-1.5"><input type="checkbox" checked={!!f.pinned} onChange={(e) => set({ pinned: e.target.checked || undefined })} />Chỉ mục ghim</label>
      </div>
      <p className="text-xs text-slate-700" aria-live="polite">{q.isLoading ? 'Đang tải…' : `${total} ký ức`}</p>
      {q.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được ký ức. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>}
      {q.isLoading && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-card bg-slate-200" />)}</div>}
      {!q.isLoading && !q.isError && rows.length === 0 && <p className="rounded-card border border-dashed border-slate-300 p-8 text-center text-sm text-slate-700">Không có ký ức nào khớp bộ lọc. Ký ức xuất hiện khi bạn dạy agent hoặc agent tự ghi lại sau mỗi task.</p>}
      <ul className="space-y-2">{rows.map((m) => <MemoryRow key={m.id} m={m} q={text} />)}</ul>
      {q.hasNextPage && <button disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()} className="w-full rounded-lg border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">{q.isFetchingNextPage ? 'Đang tải…' : `Tải thêm (${rows.length}/${total})`}</button>}
    </section>
  )
}
