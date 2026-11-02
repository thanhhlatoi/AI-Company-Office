import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErrorBanner } from '../components/ErrorBanner'
import { useDepartmentStore } from '../store/departmentStore'
import { ProjectCard } from '../features/projects/ProjectCard'
import { ProjectForm } from '../features/projects/ProjectForm'
import { useProjects } from '../features/projects/hooks'

const SEL = 'min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm'

/** /projects — danh sách dự án: lọc theo trạng thái / phòng ban, tìm theo tên. */
export default function ProjectsPage() {
  const [sp, setSp] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const depts = Object.values(useDepartmentStore((s) => s.departmentsById)).sort((a, b) => a.order - b.order)
  const status = sp.get('status') ?? 'ACTIVE' // mặc định chỉ dự án đang chạy; "all" = tất cả
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }) }
  const q = useProjects({ status: status === 'all' ? undefined : status, departmentId: sp.get('dept') ?? undefined, q: sp.get('q') ?? undefined })
  const list = q.data ?? []
  return (
    <div className="mx-auto h-full max-w-6xl space-y-4 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24">
      <header className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold">Dự án</h1>
        <button onClick={() => setCreating(true)} className="ml-auto flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"><Plus size={16} /> Dự án mới</button></header>
      <div role="search" aria-label="Lọc dự án" className="flex flex-wrap gap-2">
        <input type="search" aria-label="Tìm theo tên" placeholder="Tìm theo tên…" defaultValue={sp.get('q') ?? ''} onChange={(e) => set('q', e.target.value.trim())} className={`${SEL} w-48`} />
        <select aria-label="Trạng thái" value={status} onChange={(e) => set('status', e.target.value)} className={SEL}><option value="ACTIVE">Đang chạy</option><option value="ARCHIVED">Đã lưu trữ</option><option value="all">Tất cả</option></select>
        <select aria-label="Phòng ban" value={sp.get('dept') ?? ''} onChange={(e) => set('dept', e.target.value)} className={SEL}><option value="">Mọi phòng</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      </div>
      {q.isError && <ErrorBanner message="Không tải được danh sách dự án." onRetry={() => void q.refetch()} />}
      {q.isLoading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-card bg-slate-200" />)}</div>}
      {!q.isLoading && !q.isError && list.length === 0 && <p className="rounded-card border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Chưa có dự án nào{sp.get('q') || sp.get('dept') || status !== 'ACTIVE' ? ' khớp bộ lọc' : ''}. Bấm "Dự án mới" để tạo, rồi gán các mục tiêu vào đó.</p>}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((p) => <ProjectCard key={p.id} p={p} />)}</ul>
      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </div>
  )
}
