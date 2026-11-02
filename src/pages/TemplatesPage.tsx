import { useQuery } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listAgentsOfTemplate } from '../api/studio'
import { RiskChip } from '../components/studio/badges'
import { TwoStepConfirm } from '../components/studio/TwoStepConfirm'
import { ImportDialog } from '../features/templates/ImportDialog'
import { useTemplateActions } from '../features/templates/mutations'
import { PreviewDialog } from '../features/templates/PreviewDialog'
import { riskRank } from '../features/studio/risk'
import { useTemplates, useTools } from '../features/studio/queries'
import { foldVi } from '../lib/text'
import type { AgentTemplate } from '../types/studio'

const ORDER = ['Điều hành', 'YouTube', 'TikTok', 'Công nghệ', 'Kế toán', 'Kinh doanh', 'Hạ tầng', 'Mẫu của tôi', 'Đã nhập']
const KIND = { BUILTIN: ['Dựng sẵn', 'bg-slate-100 text-slate-800'], MINE: ['Của tôi', 'bg-blue-100 text-blue-900'], IMPORTED: ['Đã nhập', 'bg-orange-100 text-orange-950'] } as const
const FILTERS = [['', 'Tất cả'], ['BUILTIN', 'Dựng sẵn'], ['MINE', 'Của tôi'], ['IMPORTED', 'Đã nhập']] as const

export default function TemplatesPage() {
  const q = useTemplates(), tools = useTools().data ?? [], act = useTemplateActions()
  const [text, setText] = useState(''), [kind, setKind] = useState<string>(''), [open, setOpen] = useState<AgentTemplate | null>(null), [imp, setImp] = useState(false), [del, setDel] = useState<AgentTemplate | null>(null)
  const users = useQuery({ queryKey: ['templates', open?.id, 'agents'], queryFn: () => listAgentsOfTemplate(open!.id), enabled: !!open })
  const n = foldVi(text.trim())
  const list = (q.data ?? []).filter((t) => (!kind || t.kind === kind) && (!n || foldVi(`${t.name} ${t.description} ${t.group}`).includes(n)))
  const groups = [...new Set(list.map((t) => t.group))].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold">Mẫu agent</h1>
        <button onClick={() => setImp(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"><Upload size={14} aria-hidden />Nhập từ JSON</button></header>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <input aria-label="Tìm mẫu" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tìm mẫu (không dấu)…" className="min-w-52 flex-1 rounded-lg border border-slate-300 px-3 py-1.5" />
        <div role="group" aria-label="Lọc theo loại" className="flex gap-1.5">{FILTERS.map(([k, label]) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1 ${kind === k ? 'border-brand bg-blue-50 font-semibold text-brand' : 'border-slate-300 text-slate-700'}`}>{label}</button>)}</div>
      </div>
      {q.isLoading && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-card bg-slate-200" />)}</div>}
      {q.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được mẫu. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>}
      {q.data && list.length === 0 && <p className="rounded-card border border-dashed border-slate-300 p-8 text-center text-sm text-slate-700">Không có mẫu nào khớp. Bạn có thể nhập một mẫu từ JSON hoặc lưu một agent đang chạy thành mẫu (ở trang Cấu hình của agent).</p>}
      {groups.map((g) => (
        <section key={g} aria-label={`Nhóm ${g}`} className="mb-5"><h2 className="mb-2 text-sm font-semibold text-slate-800">{g}</h2>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.filter((t) => t.group === g).map((t) => {
            const top = t.suggestedTools.map((s) => tools.find((x) => x.id === s.toolId)).filter((x) => !!x).sort((a, b) => riskRank(b!.risk) - riskRank(a!.risk))[0]
            return (
              <li key={t.id} className="flex flex-col gap-2 rounded-card border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2"><b>{t.name}</b><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND[t.kind][1]}`}>{KIND[t.kind][0]}</span></div>
                <p className="text-sm text-slate-800">{t.description}</p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-slate-700">v{t.version} · {t.suggestedTools.length} công cụ đề xuất{top && <>· cao nhất <RiskChip risk={top.risk} /></>}{t.modelRequirement.preferLocal && <span className="font-semibold text-green-900">ưu tiên LOCAL</span>}</p>
                <div className="mt-auto flex gap-2 border-t border-slate-200 pt-2 text-sm"><button onClick={() => setOpen(t)} className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50">Xem trước</button><Link to={`/templates/${t.id}/create`} className="rounded-lg bg-brand px-3 py-1 font-medium text-white hover:bg-brand-dark">Tạo agent</Link></div>
              </li>
            )
          })}</ul></section>
      ))}
      {open && <PreviewDialog t={open} agentCount={users.data?.length ?? 0} onClose={() => setOpen(null)} onClone={() => act.clone.mutate(open.id, { onSuccess: () => setOpen(null) })} onDelete={() => { setDel(open); setOpen(null) }} />}
      {imp && <ImportDialog onClose={() => setImp(false)} />}
      {del && <TwoStepConfirm title="Xoá mẫu?" askReason={false} confirmLabel="Xoá" busy={act.remove.isPending} preview={<p className="text-sm">Xoá mẫu <b>{del.name}</b>. Các agent đã tạo từ mẫu này vẫn giữ nguyên, chỉ không còn nhận thông báo "mẫu có bản mới".</p>} onClose={() => setDel(null)} onConfirm={() => act.remove.mutate(del.id, { onSuccess: () => setDel(null) })} />}
    </div>
  )
}
