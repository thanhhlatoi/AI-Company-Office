import { X } from 'lucide-react'
import Markdown from 'react-markdown'
import { Avatar } from '../../components/Avatar'
import { formatDateTime } from '../../lib/time'
import { useAgentStore } from '../../store/agentStore'
import type { Task } from '../../types'
import { PriorityBadge } from './PriorityBadge'
import { TASK_STYLE } from './style'

/** Chi tiết một task: kết quả, lỗi, số lần thử, người giao. */
export function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const agents = useAgentStore((s) => s.agentsById)
  const who = (id?: string | null) => (id ? agents[id] : undefined)
  const owner = who(task.agentId)
  const giver = who(task.assignedById)
  const st = TASK_STYLE[task.status]
  return (
    <aside aria-label={`Chi tiết task ${task.title}`} className="rounded-card border border-slate-300 bg-white p-4">
      <div className="flex items-start gap-2">
        <h3 className="flex-1 text-lg font-semibold">{task.title}</h3>
        <button aria-label="Đóng chi tiết" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={18} /></button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full px-3 py-0.5 text-sm font-medium" style={{ background: st.soft, color: st.color }}>{st.label}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-2 text-sm">
        <dt className="text-slate-600">Người nhận</dt>
        <dd className="flex items-center gap-2">{owner ? <><Avatar name={owner.name} color={owner.color} size={20} />{owner.name}</> : `Agent ${task.agentId}`}</dd>
        <dt className="text-slate-600">Người giao</dt>
        <dd>{giver ? giver.name : 'Chủ công ty / hệ thống'}</dd>
        <dt className="text-slate-600">Số lần thử</dt><dd>{task.attempts}</dd>
        <dt className="text-slate-600">Token đã dùng</dt><dd>{task.tokensUsed.toLocaleString('vi-VN')}</dd>
        <dt className="text-slate-600">Bắt đầu</dt><dd>{task.startedAt ? formatDateTime(task.startedAt) : '—'}</dd>
        <dt className="text-slate-600">Cập nhật</dt><dd>{formatDateTime(task.updatedAt)}</dd>
      </dl>
      {task.error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"><b>Lỗi:</b> {task.error}</p>}
      <h4 className="mb-1 mt-4 text-sm font-semibold">Kết quả</h4>
      <div className="md">{task.result ? <Markdown>{task.result}</Markdown> : <span className="text-sm text-slate-600">Chưa có kết quả.</span>}</div>
    </aside>
  )
}
