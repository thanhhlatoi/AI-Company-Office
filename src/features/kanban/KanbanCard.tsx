import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { Lock } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Avatar } from '../../components/Avatar'
import { formatDuration, timeAgo } from '../../lib/time'
import { useMoney } from '../../lib/useMoney'
import { useAgentStore } from '../../store/agentStore'
import { useWorkStore } from '../../store/workStore'
import type { Task } from '../../types'
import type { Project } from '../../types/project'
import { PriorityBadge } from '../goals/PriorityBadge'
import { TASK_STYLE } from '../goals/style'
import { canDrag } from './columns'

export interface CardProps { task: Task; project?: Project; now: number; pending?: boolean }

function ageText(t: Task, now: number) {
  const since = (iso: string) => formatDuration(now - Date.parse(iso))
  if (t.status === 'QUEUED' || t.status === 'WAITING_BUDGET') return `chờ ${since(t.createdAt)}`
  if (t.status === 'RUNNING') return `đang chạy ${since(t.startedAt ?? t.updatedAt)}`
  if (t.status === 'AWAITING_APPROVAL') return `chờ duyệt ${since(t.updatedAt)}`
  return timeAgo(t.updatedAt, now)
}

/** Phần hiển thị của thẻ (dùng cả cho thẻ thật lẫn bản "bay theo chuột" khi kéo). */
export function CardBody({ task, project, now, pending, menu }: CardProps & { menu?: ReactNode }) {
  const agent = useAgentStore((s) => s.agentsById[task.agentId])
  const goal = useWorkStore((s) => (task.goalId ? s.goalsById[task.goalId]?.title : undefined))
  const money = useMoney()
  const failed = task.status === 'FAILED'
  return (
    <div className={`card-in rounded-card border-2 bg-white p-2.5 text-left shadow-card ${failed ? 'border-red-300' : 'border-slate-200'} ${pending ? 'opacity-50' : ''}`} aria-busy={pending}>
      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        {project && <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: project.color }} title={project.name} />}
        <span className="min-w-0 flex-1 truncate">{goal ?? project?.name ?? ' '}</span>
        {task.locked && <Lock size={13} className="shrink-0 text-amber-700" aria-label="Đã khoá: duyệt qua hộp thoại phê duyệt" />}
        {menu}
      </div>
      <div className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{task.title}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Avatar name={agent?.name ?? '?'} color={agent?.color ?? '#94a3b8'} size={20} />
        <span className="min-w-0 max-w-[7rem] truncate text-xs text-slate-600">{agent?.name ?? `Agent ${task.agentId}`}</span>
        <PriorityBadge priority={task.priority} />
        {task.status === 'WAITING_BUDGET' && <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: TASK_STYLE.WAITING_BUDGET.soft, color: TASK_STYLE.WAITING_BUDGET.color }}>Chờ ngân sách</span>}
        {failed && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">Lỗi</span>}
      </div>
      {task.progressPct != null && (
        <div role="progressbar" aria-label="Tiến độ task cha" aria-valuenow={task.progressPct} aria-valuemin={0} aria-valuemax={100} className="mt-1.5 h-1.5 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-green-600" style={{ width: `${task.progressPct}%` }} /></div>
      )}
      <div className="mt-1.5 flex justify-between gap-2 text-xs text-slate-600"><span>{ageText(task, now)}</span>{task.costMicro > 0 && <span className="tabular-nums">{money(task.costMicro)}</span>}</div>
    </div>
  )
}

/** Thẻ kéo thả được (dnd-kit: chuột, cảm ứng, bàn phím). Thẻ khoá hoặc đang xử lý thì không kéo. */
export function SortableCard({ onOpen, menu, ...p }: CardProps & { onOpen: () => void; menu: ReactNode }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: p.task.id, disabled: !canDrag(p.task) || p.pending })
  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    ;(listeners?.onKeyDown as ((ev: KeyboardEvent) => void) | undefined)?.(e) // Space = nhấc/thả (dnd-kit)
    if (e.key === 'Enter') onOpen() // Enter = mở chi tiết
  }
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners} onKeyDown={onKeyDown} onClick={onOpen}
      aria-label={`${p.task.title}. ${TASK_STYLE[p.task.status].label}. Space để nhấc, Enter để mở.`}
      className={`list-none rounded-card outline-none focus-visible:ring-4 focus-visible:ring-brand/40 ${canDrag(p.task) ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isDragging ? 'opacity-30' : ''}`}>
      <CardBody {...p} menu={menu} />
    </li>
  )
}
