import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { StatusBadge } from '../components/StatusBadge'
import { useAgentsQuery } from '../features/agents/hooks'
import { STATUS_STYLE } from '../lib/statusColors'
import { useAgentStore } from '../store/agentStore'
import { useDepartmentStore } from '../store/departmentStore'
import { useUiStore } from '../store/uiStore'
import { AgentStatusValues, type AgentStatus } from '../types'

export default function AgentsPage() {
  const { isLoading } = useAgentsQuery()
  const agentsById = useAgentStore((s) => s.agentsById)
  const openForm = useUiStore((s) => s.openForm)
  const departments = useDepartmentStore((s) => s.departmentsById)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AgentStatus | ''>('')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return Object.values(agentsById).filter(
      (a) => (!status || a.status === status) && (!q || `${a.name} ${a.role}`.toLowerCase().includes(q)),
    )
  }, [agentsById, search, status])
  const total = Object.keys(agentsById).length

  if (isLoading) return <div className="space-y-2 p-6">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-card bg-slate-200" />)}</div>

  if (!total) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <h1 className="sr-only">Danh sách agent</h1>
          <p className="text-slate-600">Chưa có agent nào.</p>
          <button onClick={() => openForm()} className="mt-3 rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark">Tạo agent đầu tiên</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="sr-only">Danh sách agent</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <input aria-label="Tìm agent" placeholder="Tìm theo tên hoặc vai trò…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select aria-label="Lọc theo trạng thái" value={status} onChange={(e) => setStatus(e.target.value as AgentStatus | '')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Tất cả trạng thái</option>
          {AgentStatusValues.map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-card bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600">
            <tr><th className="p-3">Agent</th><th className="p-3">Phòng</th><th className="p-3">Vai trò</th><th className="p-3">Model</th><th className="p-3">Trạng thái</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} tabIndex={0} onClick={() => navigate(`/agents/${a.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/agents/${a.id}`)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3"><span className="flex items-center gap-2"><Avatar name={a.name} color={a.color} size={28} />{a.name}</span></td>
                <td className="p-3">{(a.departmentId && departments[a.departmentId]?.name) || '—'}</td>
                <td className="p-3">{a.role}</td>
                <td className="p-3 text-slate-600">{a.model}</td>
                <td className="p-3"><StatusBadge agent={a} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-6 text-center text-slate-600">Không có agent phù hợp.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
