import { Pencil, Settings2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { Modal } from '../../components/Modal'
import { StatusBadge } from '../../components/StatusBadge'
import { useNavigate } from 'react-router-dom'
import { INFRA_SLUG } from '../../config/departments'
import { useDeviceStore } from '../../store/deviceStore'
import { useRealtimeStore } from '../../store/realtimeStore'
import { useUiStore } from '../../store/uiStore'
import type { Agent } from '../../types'
import { AgentBudget } from '../costs/AgentBudget'
import { AgentModelInfo } from '../models/AgentModelInfo'
import { SkillChips } from '../models/SkillChips'
import { useDeleteAgent } from './hooks'
import { MovementCard } from './MovementCard'

export function OverviewTab({ agent, onDeleted }: { agent: Agent; onDeleted: () => void }) {
  const openForm = useUiStore((s) => s.openForm)
  const toast = useUiStore((s) => s.toast)
  const del = useDeleteAgent()
  const approvalId = useRealtimeStore((s) => Object.keys(s.approvals).find((id) => s.approvals[id] === agent.id))
  const [confirming, setConfirming] = useState(false)
  const navigate = useNavigate()
  const device = useDeviceStore((s) => (agent.runsOnDeviceId ? s.devicesById[agent.runsOnDeviceId] : undefined))

  const confirmDelete = () =>
    del.mutate(agent.id, {
      onSuccess: () => { toast(`Đã xoá ${agent.name}`); setConfirming(false); onDeleted() },
      onError: () => toast('Xoá thất bại', 'error'),
    })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={agent.name} color={agent.color} size={56} />
        <div>
          <div className="text-lg font-semibold">{agent.name}</div>
          <div className="text-sm text-slate-600">{agent.role}</div>
        </div>
      </div>
      <MovementCard agentId={agent.id} />
      <AgentBudget agent={agent} />
      {approvalId && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-card border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          <span>{agent.name} đang chờ bạn duyệt.</span>
          <button onClick={() => useUiStore.getState().openInbox(approvalId)} aria-label={`Xem yêu cầu của ${agent.name}`} className="rounded-lg bg-amber-700 px-3 py-1 font-medium text-white hover:bg-amber-800">
            Xem và duyệt
          </button>
        </div>
      )}
      <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
        <AgentModelInfo agentId={agent.id} fallback={agent.model} />
        <dt className="text-slate-600">Kỹ năng</dt>
        <dd><SkillChips skills={agent.skills} /></dd>
        <dt className="text-slate-600">Trạng thái</dt><dd><StatusBadge agent={agent} /></dd>
        <dt className="text-slate-600">Task hiện tại</dt><dd>{agent.currentTask?.title ?? '—'}</dd>
        {device && (
          <><dt className="text-slate-600">Chạy trên</dt>
          <dd><button onClick={() => { navigate(`/department/${INFRA_SLUG}`); useDeviceStore.getState().select(device.id) }} className="text-brand underline">{device.name}</button>{device.status === 'OFFLINE' && <span className="ml-2 text-red-600">Mất máy chủ</span>}</dd></>
        )}
      </dl>
      <div className="flex gap-2">
        <button onClick={() => navigate(`/agents/${agent.id}/studio`)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          <Settings2 size={14} /> Cấu hình
        </button>
        <button aria-label="Sửa agent" onClick={() => openForm(agent.id)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          <Pencil size={14} /> Sửa
        </button>
        <button aria-label="Xoá agent" onClick={() => setConfirming(true)} className="flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
          <Trash2 size={14} /> Xoá
        </button>
      </div>
      {confirming && (
        <Modal title="Xoá agent?" onClose={() => setConfirming(false)}>
          <p className="text-sm">Bạn chắc chắn muốn xoá <b>{agent.name}</b>? Không thể hoàn tác.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setConfirming(false)} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Huỷ</button>
            <button onClick={confirmDelete} disabled={del.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">Xoá</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
