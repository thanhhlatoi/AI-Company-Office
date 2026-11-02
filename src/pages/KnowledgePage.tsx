import { Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SensitivityBadge, DataClassBadge } from '../components/studio/badges'
import { CollectionForm } from '../features/knowledge/CollectionForm'
import { useCollections } from '../features/studio/queries'
import { formatUsd } from '../lib/money'
import { useAgentStore } from '../store/agentStore'
import { useDepartmentStore } from '../store/departmentStore'
import type { Collection } from '../types/knowledge'

const STATE = { READY: ['Sẵn sàng', 'bg-green-100 text-green-900'], INDEXING: ['Đang lập chỉ mục', 'bg-sky-100 text-sky-950'], REINDEXING: ['Đang dựng lại', 'bg-sky-100 text-sky-950'], FAILED: ['Lỗi chỉ mục', 'bg-red-100 text-red-900'] } as const

export default function KnowledgePage() {
  const q = useCollections(), nav = useNavigate()
  const depts = useDepartmentStore((s) => s.departmentsById), agents = useAgentStore((s) => s.agentsById)
  const [form, setForm] = useState(false)
  const scope = (c: Collection) => (c.scope.kind === 'SHARED' ? 'Chung toàn công ty' : c.scope.kind === 'DEPARTMENT' ? `Phòng ${depts[c.scope.id ?? '']?.name ?? c.scope.id}` : `Agent ${agents[c.scope.id ?? '']?.name ?? c.scope.id}`)
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold">Kho tài liệu</h1>
        <button onClick={() => setForm(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm text-white hover:bg-brand-dark"><Plus size={14} aria-hidden />Tạo bộ sưu tập</button></header>
      {q.isLoading && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-card bg-slate-200" />)}</div>}
      {q.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được bộ sưu tập. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>}
      {q.data?.length === 0 && <p className="rounded-card border border-dashed border-slate-300 p-8 text-center text-sm text-slate-700">Chưa có bộ sưu tập nào. Tạo bộ sưu tập đầu tiên rồi kéo thả tài liệu vào để agent tra cứu.</p>}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {q.data?.map((c) => {
          const [label, cls] = STATE[c.indexState], risky = c.sensitivity === 'CONFIDENTIAL' && c.embeddingModel.dataClass === 'CLOUD'
          return (
            <li key={c.id} className="flex flex-col gap-2 rounded-card border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2"><Link to={`/knowledge/${c.id}`} className="font-semibold text-brand underline">{c.name}</Link><SensitivityBadge value={c.sensitivity} /></div>
              <p className="text-sm text-slate-700">{c.description || 'Không có mô tả'}</p>
              <p className="text-xs text-slate-700">{scope(c)} · {c.docCount} tài liệu</p>
              <div className="flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full px-2 py-0.5 font-medium ${cls}`}>{label}{c.indexState === 'REINDEXING' ? ` ${c.reindexPct ?? 0}%` : ''}</span><span>Embedding: {c.embeddingModel.label}</span><DataClassBadge value={c.embeddingModel.dataClass} /><span>Chi phí nhúng {formatUsd(c.embeddingCostMicro)}</span></div>
              {risky && <p role="alert" className="flex gap-1.5 rounded-lg bg-orange-50 p-2 text-xs text-orange-950"><TriangleAlert size={14} className="shrink-0" aria-hidden />Dữ liệu MẬT nhưng dùng model embedding CLOUD — nên chuyển sang LOCAL.</p>}
            </li>
          )
        })}
      </ul>
      {form && <CollectionForm onClose={() => setForm(false)} onCreated={(id) => nav(`/knowledge/${id}`)} />}
    </div>
  )
}
