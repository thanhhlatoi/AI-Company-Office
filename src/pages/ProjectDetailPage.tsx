import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { ErrorBanner } from '../components/ErrorBanner'
import { useDepartmentStore } from '../store/departmentStore'
import { KanbanBoard } from '../features/kanban/KanbanBoard'
import { KanbanToolbar } from '../features/kanban/KanbanToolbar'
import { useBoardFilters } from '../features/kanban/filters'
import { TaskDrawer } from '../features/kanban/TaskDrawer'
import { CostTab } from '../features/projects/CostTab'
import { useProject, useProjectStatus } from '../features/projects/hooks'
import { LogTab } from '../features/projects/LogTab'
import { OverviewTab } from '../features/projects/OverviewTab'

const TABS = [['overview', 'Tổng quan'], ['tasks', 'Task'], ['costs', 'Chi phí'], ['log', 'Nhật ký']] as const

/** /projects/:id?tab=overview|tasks|costs|log */
export default function ProjectDetailPage() {
  const { id = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const q = useProject(id)
  const status = useProjectStatus()
  const f = useBoardFilters(id)
  const [confirm, setConfirm] = useState(false)
  const dept = useDepartmentStore((s) => (q.data?.departmentId ? s.departmentsById[q.data.departmentId]?.name : undefined))
  const tab = (TABS.find(([k]) => k === sp.get('tab'))?.[0] ?? 'overview') as (typeof TABS)[number][0]
  const p = q.data
  const go = (t: string) => setSp({ tab: t }, { replace: true })
  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 pt-3">
          <Link to="/projects" className="text-sm text-brand underline">← Dự án</Link>
          {q.isError && <div className="my-2"><ErrorBanner message="Không tải được dự án (có thể không tồn tại)." onRetry={() => void q.refetch()} /></div>}
          {q.isLoading && <div className="my-2 h-8 w-64 animate-pulse rounded bg-slate-200" />}
          {p && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="size-4 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              <h1 className="text-xl font-bold">{p.name}</h1>
              <span className="text-sm text-slate-600">{dept ?? 'Không thuộc phòng'}</span>
              {p.status === 'ARCHIVED' && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">Đã lưu trữ</span>}
              <button onClick={() => setConfirm(true)} className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">{p.status === 'ACTIVE' ? 'Lưu trữ' : 'Mở lại'}</button>
            </div>
          )}
          <div role="tablist" aria-label="Các phần của dự án" className="mt-2 flex gap-1">
            {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k)} className={`border-b-2 px-3 py-2 text-sm ${tab === k ? 'border-brand font-semibold text-brand' : 'border-transparent text-slate-600'}`}>{label}</button>)}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
          {p && tab === 'overview' && <div className="p-4 pb-24"><OverviewTab project={p} onShowTasks={() => go('tasks')} /></div>}
          {p && tab === 'costs' && <div className="p-4 pb-24"><CostTab project={p} /></div>}
          {p && tab === 'log' && <div className="p-4 pb-24"><LogTab id={p.id} /></div>}
          {p && tab === 'tasks' && <div className="flex h-full flex-col"><KanbanToolbar lockProject={p.id} /><div className="min-h-0 flex-1"><KanbanBoard lockProject={p.id} /></div></div>}
        </div>
      </div>
      {tab === 'tasks' && f.taskId && <TaskDrawer key={f.taskId} id={f.taskId} onClose={() => f.set({ task: null })} />}
      {confirm && p && (
        <Modal title={p.status === 'ACTIVE' ? 'Lưu trữ dự án?' : 'Mở lại dự án?'} onClose={() => setConfirm(false)}>
          <p className="text-sm">{p.status === 'ACTIVE' ? <>Lưu trữ <b>{p.name}</b>? Dự án sẽ ẩn khỏi danh sách đang chạy, bạn có thể mở lại bất cứ lúc nào.</> : <>Mở lại <b>{p.name}</b> để tiếp tục làm việc?</>}</p>
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setConfirm(false)} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Không</button>
            <button disabled={status.isPending} onClick={() => status.mutate({ id: p.id, action: p.status === 'ACTIVE' ? 'archive' : 'reopen' }, { onSuccess: () => setConfirm(false) })} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{p.status === 'ACTIVE' ? 'Lưu trữ' : 'Mở lại'}</button></div>
        </Modal>
      )}
    </div>
  )
}
