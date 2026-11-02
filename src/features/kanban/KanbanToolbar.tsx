import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useProjects } from '../projects/hooks'
import { useBoardFilters } from './filters'

const SEL = 'min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm'

/** Lọc / tìm / nhóm. Mọi giá trị nằm trong URL nên copy link là chia sẻ được bộ lọc. */
export function KanbanToolbar({ lockProject }: { lockProject?: string }) {
  const f = useBoardFilters(lockProject)
  const agents = Object.values(useAgentStore((s) => s.agentsById)).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const depts = Object.values(useDepartmentStore((s) => s.departmentsById)).sort((a, b) => a.order - b.order)
  const projects = useProjects({}).data ?? []
  const [q, setQ] = useState(f.get('q'))
  useEffect(() => { // gõ xong 300ms mới ghi vào URL
    if (q === f.get('q')) return
    const t = setTimeout(() => f.set({ q: q.trim() || null }), 300)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps
  const bind = (key: string) => ({ value: f.get(key), onChange: (e: React.ChangeEvent<HTMLSelectElement>) => f.set({ [key]: e.target.value || null }) })
  const filtered = ['agent', 'dept', 'project', 'prio', 'q'].some((k) => f.get(k))
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2" role="search" aria-label="Lọc bảng task">
      <label className="relative"><span className="sr-only">Tìm trong tiêu đề</span><Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-slate-600" aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trong tiêu đề…" className={`${SEL} w-48 pl-8`} /></label>
      <select aria-label="Agent" {...bind('agent')} className={SEL}><option value="">Mọi agent</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      <select aria-label="Phòng ban" {...bind('dept')} className={SEL}><option value="">Mọi phòng</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      {!lockProject && <select aria-label="Dự án" {...bind('project')} className={SEL}><option value="">Mọi dự án</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
      <select aria-label="Ưu tiên" {...bind('prio')} className={SEL}><option value="">Mọi ưu tiên</option><option value="HIGH">Cao</option><option value="NORMAL">Thường</option><option value="LOW">Thấp</option></select>
      <select aria-label="Nhóm theo hàng ngang" {...bind('group')} className={`${SEL} ml-auto`}><option value="">Không nhóm</option><option value="agent">Nhóm theo agent</option><option value="project">Nhóm theo dự án</option></select>
      {filtered && <button onClick={() => { setQ(''); f.set({ agent: null, dept: null, project: null, prio: null, q: null }) }} className="min-h-9 rounded-lg px-3 text-sm text-brand underline">Xoá bộ lọc</button>}
    </div>
  )
}
