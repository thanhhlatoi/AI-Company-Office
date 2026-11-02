import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import Markdown from 'react-markdown'
import { formatDateTime, timeAgo } from '../../lib/time'
import type { Task, TaskStatus } from '../../types'
import { useTasks } from './hooks'

const TASK_LABEL: Record<TaskStatus, string> = { QUEUED: 'Chờ', WAITING_BUDGET: 'Chờ ngân sách', AWAITING_APPROVAL: 'Chờ duyệt', RUNNING: 'Đang chạy', DONE: 'Xong', FAILED: 'Thất bại', CANCELLED: 'Đã huỷ' }

function TaskItem({ task }: { task: Task }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-lg border border-slate-200">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2 p-2 text-left text-sm">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="flex-1 truncate font-medium">{task.title}</span>
        <span className="text-xs text-slate-600">{TASK_LABEL[task.status]}</span>
        <time className="text-xs text-slate-600" title={formatDateTime(task.updatedAt)}>{timeAgo(task.updatedAt)}</time>
      </button>
      {open && (
        <div className="border-t border-slate-100 p-3 md">
          {task.result ? <Markdown>{task.result}</Markdown> : <span className="text-slate-600">Chưa có kết quả.</span>}
        </div>
      )}
    </li>
  )
}

export function HistoryTab({ agentId }: { agentId: string }) {
  const { data, isLoading, isError } = useTasks(agentId)
  if (isLoading) return <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
  if (isError) return <p className="text-sm text-red-600">Không tải được lịch sử task.</p>
  if (!data?.length) return <p className="text-sm text-slate-600">Chưa có task nào.</p>
  return <ul className="space-y-2">{data.map((t) => <TaskItem key={t.id} task={t} />)}</ul>
}
