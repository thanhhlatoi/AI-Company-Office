import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useWorkStore } from '../../store/workStore'
import { useProjects } from '../projects/hooks'
import { useHistoryFilters } from './filters'

const SEL = 'min-h-9 max-w-[11rem] rounded-lg border border-slate-300 bg-white px-2 text-sm'
const TOOLS = ['search_web', 'read_file', 'send_email', 'http_request'] // công cụ thường gặp (BE có thể trả thêm)

/** Ô tìm kiếm lớn (gõ KHÔNG DẤU được) + bộ lọc. Mọi giá trị nằm trong URL. */
export function HistoryFilters() {
  const f = useHistoryFilters()
  const agents = Object.values(useAgentStore((s) => s.agentsById)).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const depts = Object.values(useDepartmentStore((s) => s.departmentsById)).sort((a, b) => a.order - b.order)
  const goals = Object.values(useWorkStore((s) => s.goalsById))
  const projects = useProjects({}).data ?? []
  const [q, setQ] = useState(f.get('q'))
  useEffect(() => { // gõ xong 300ms mới ghi vào URL
    if (q === f.get('q')) return
    const t = setTimeout(() => f.set({ q: q.trim() || null }), 300)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = (key: string, label: string, options: [string, string][]) => (
    <select aria-label={label} value={f.get(key)} onChange={(e) => f.set({ [key]: e.target.value || null })} className={SEL}><option value="">{label}</option>{options.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
  )
  return (
    <div role="search" aria-label="Tìm hội thoại" className="space-y-2 border-b border-slate-200 bg-white p-3">
      <label className="relative block"><span className="sr-only">Tìm trong lịch sử hội thoại</span><Search size={18} className="pointer-events-none absolute left-3 top-3 text-slate-600" aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trong tiêu đề và nội dung hội thoại…" className="w-full rounded-lg border-2 border-slate-300 py-2.5 pl-10 pr-3 text-base focus:border-brand focus:outline-none" /></label>
      <p className="text-xs text-slate-600">Gõ không dấu cũng được: "ke toan" tìm được "kế toán".</p>
      <div className="flex flex-wrap items-center gap-2">
        {sel('agent', 'Mọi agent', agents.map((a) => [a.id, a.name]))}
        {sel('dept', 'Mọi phòng', depts.map((d) => [d.id, d.name]))}
        {sel('project', 'Mọi dự án', projects.map((p) => [p.id, p.name]))}
        {sel('goal', 'Mọi mục tiêu', goals.map((g) => [g.id, g.title]))}
        {sel('role', 'Mọi vai trò', [['USER', 'Người dùng'], ['ASSISTANT', 'AI'], ['TOOL', 'Công cụ']])}
        {sel('tool', 'Mọi công cụ', TOOLS.map((t) => [t, t]))}
        <input type="date" aria-label="Từ ngày" value={f.get('from')} onChange={(e) => f.set({ from: e.target.value || null })} className={SEL} />
        <input type="date" aria-label="Đến ngày" value={f.get('to')} onChange={(e) => f.set({ to: e.target.value || null })} className={SEL} />
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={f.get('error') === '1'} onChange={(e) => f.set({ error: e.target.checked ? '1' : null })} /> Chỉ có lỗi</label>
        <select aria-label="Sắp xếp" value={f.sort} onChange={(e) => f.set({ sort: e.target.value })} className={`${SEL} ml-auto`}><option value="relevance">Liên quan nhất</option><option value="newest">Mới nhất</option></select>
        {f.active && <button onClick={() => { setQ(''); f.clear() }} className="min-h-9 rounded-lg px-3 text-sm text-brand underline">Xoá bộ lọc</button>}
      </div>
    </div>
  )
}
