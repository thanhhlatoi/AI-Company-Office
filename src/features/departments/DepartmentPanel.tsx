import { Plus, Target, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { CountUp } from '../../components/CountUp'
import { DepartmentIcon } from '../../components/DepartmentIcon'
import { PANEL_CLASS } from '../../components/panelStyles'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDateTime } from '../../lib/time'
import { useAgentStore } from '../../store/agentStore'
import { useRealtimeStore } from '../../store/realtimeStore'
import { statsOf, useAgentsByDepartment } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { paletteFor } from '../../styles/tokens'
import type { Department } from '../../types'
import { GoalForm } from './GoalForm'
import { useDepartmentKpi } from './hooks'

function Kpi({ label, value, decimals = 0, prefix = '', tone }: { label: string; value: number; decimals?: number; prefix?: string; tone?: string }) {
  return (
    <div className="rounded-card border border-slate-200 p-3">
      <div className="text-xs text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: tone }}>{prefix}<CountUp value={value} decimals={decimals} /></div>
    </div>
  )
}

/** Panel phòng ban: KPI, thành viên, nhật ký gộp, nút thêm agent / giao mục tiêu. */
export function DepartmentPanel({ department, onClose }: { department: Department; onClose: () => void }) {
  const navigate = useNavigate()
  const openForm = useUiStore((s) => s.openForm)
  const [goalOpen, setGoalOpen] = useState(false)
  const byDept = useAgentsByDepartment()
  const members = useMemo(() => byDept[department.id] ?? [], [byDept, department.id])
  const stats = statsOf(members)
  const kpi = useDepartmentKpi(department.id).data
  const agentsById = useAgentStore((s) => s.agentsById)
  const eventsByAgent = useRealtimeStore((s) => s.eventsByAgent)
  const palette = paletteFor(department.color)
  const head = members.find((a) => a.isHead)

  // Nhật ký cả phòng = event của mọi thành viên gộp lại, mới nhất ở trên
  const log = useMemo(() => {
    const ids = new Set(members.map((a) => a.id))
    return Object.entries(eventsByAgent).filter(([id]) => ids.has(id)).flatMap(([, ev]) => ev).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50)
  }, [members, eventsByAgent])

  const go = (id: string) => navigate(`/department/${department.slug}/agent/${id}`)

  return (
    <aside aria-label={`Phòng ${department.name}`} className={PANEL_CLASS}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: palette.accent, color: palette.textOnAccent }}>
        <DepartmentIcon name={department.icon} size={24} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold tracking-wide">{department.name}</h2>
          {head && (
            <button onClick={() => go(head.id)} aria-label={`Mở trưởng phòng ${head.name}`} className="flex items-center gap-1.5 text-sm underline-offset-2 hover:underline">
              <Avatar name={head.name} color={head.color} size={20} /> {head.name}
            </button>
          )}
        </div>
        <button aria-label="Đóng panel phòng" onClick={onClose} className="rounded p-1 hover:bg-white/20"><X size={18} /></button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Hoàn thành hôm nay" value={kpi?.doneToday ?? 0} tone="#15803d" />
          <Kpi label="Đang chạy" value={stats.working} tone="#a16207" />
          <Kpi label="Lỗi" value={stats.error} tone={stats.error ? '#dc2626' : undefined} />
          {kpi?.tokenCostToday != null && <Kpi label="Chi phí token hôm nay" value={kpi.tokenCostToday} decimals={2} prefix="$" />}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => openForm(undefined, department.id)} aria-label="Thêm agent vào phòng" className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            <Plus size={14} /> Thêm agent vào phòng
          </button>
          {head && (
            <button onClick={() => setGoalOpen(!goalOpen)} aria-expanded={goalOpen} aria-label="Giao mục tiêu cho phòng" className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm text-white hover:bg-brand-dark">
              <Target size={14} /> Giao mục tiêu cho phòng
            </button>
          )}
        </div>
        {goalOpen && head && <GoalForm departmentId={department.id} />}

        <section>
          <h3 className="mb-2 text-sm font-semibold">Thành viên ({members.length})</h3>
          <ul className="space-y-1">
            {members.map((a) => (
              <li key={a.id}>
                <button onClick={() => go(a.id)} aria-label={`Mở ${a.name}`} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
                  <Avatar name={a.name} color={a.color} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.isHead && '★ '}{a.name}</span>
                    <span className="block truncate text-xs text-slate-600">{a.role}</span>
                  </span>
                  <StatusBadge agent={a} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Nhật ký hoạt động</h3>
          {log.length === 0
            ? <p className="text-sm text-slate-600">Chưa có sự kiện nào kể từ khi mở trang.</p>
            : (
              <ul className="space-y-1 font-mono text-xs">
                {log.map((e) => (
                  <li key={e.id}><span className="text-slate-600">{formatDateTime(e.createdAt)}</span> <b>{agentsById[e.agentId]?.name}</b>: {e.message}</li>
                ))}
              </ul>
            )}
        </section>
      </div>
    </aside>
  )
}
