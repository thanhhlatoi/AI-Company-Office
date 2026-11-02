import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { Ban } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ErrorBanner } from '../../components/ErrorBanner'
import { useAgentStore } from '../../store/agentStore'
import { useUiStore } from '../../store/uiStore'
import { useWorkStore } from '../../store/workStore'
import type { Priority, Task } from '../../types'
import type { KanbanColumnId } from '../../types/kanban'
import { useNow } from '../approvals/hooks'
import { useProjects } from '../projects/hooks'
import { useCancelTask, useSetPriority } from '../queue/hooks'
import { BoardDialogs, type Pending } from './BoardDialogs'
import { CardMenu, type CardActions } from './CardMenu'
import { COLUMNS, cancellable, hintAllows, redoable } from './columns'
import { useBoardFilters } from './filters'
import { useKanbanColumn, useMoveTask } from './hooks'
import { CANCEL_ZONE, useBoardDnd } from './useBoardDnd'
import { CardBody, SortableCard } from './KanbanCard'
import { KanbanColumn } from './KanbanColumn'

function CancelZone() {
  const { setNodeRef, isOver } = useDroppable({ id: CANCEL_ZONE })
  return (
    <div ref={setNodeRef} role="region" aria-label="Vùng thả để huỷ" className={`pointer-events-auto absolute inset-x-6 bottom-20 z-20 flex h-16 items-center justify-center gap-2 rounded-card border-2 border-dashed text-sm font-semibold ${isOver ? 'border-red-600 bg-red-100 text-red-800' : 'border-red-300 bg-white/95 text-red-700'}`}>
      <Ban size={18} aria-hidden="true" /> Thả vào đây để huỷ
    </div>
  )
}

/** Bảng Kanban: 4 cột + cột phụ "Lỗi / Huỷ", kéo thả theo luật của BE, nhóm theo hàng ngang. `lockProject` = dự án cố định. */
export function KanbanBoard({ lockProject }: { lockProject?: string }) {
  const f = useBoardFilters(lockProject)
  const cols = { QUEUED: useKanbanColumn('QUEUED', f.api), RUNNING: useKanbanColumn('RUNNING', f.api), AWAITING_APPROVAL: useKanbanColumn('AWAITING_APPROVAL', f.api), DONE: useKanbanColumn('DONE', f.api), FAILED_CANCELLED: useKanbanColumn('FAILED_CANCELLED', f.api) }
  const projects = useProjects({}).data
  const agents = useAgentStore((s) => s.agentsById)
  const approvals = useWorkStore((s) => s.approvalsById)
  const now = useNow(30_000)
  const qc = useQueryClient()
  const move = useMoveTask(), prio = useSetPriority(), cancel = useCancelTask()
  const [busy, setBusy] = useState<Set<string>>(new Set()) // thẻ "đang xử lý" (chờ BE xác nhận)
  const [dlg, setDlg] = useState<Pending>(null)
  const refresh = () => void qc.invalidateQueries({ queryKey: ['kanban'] })

  const flat = (d: typeof cols.QUEUED.data) => d?.pages.flatMap((p) => p.items) ?? []
  const byCol: Record<KanbanColumnId, Task[]> = { QUEUED: flat(cols.QUEUED.data), RUNNING: flat(cols.RUNNING.data), AWAITING_APPROVAL: flat(cols.AWAITING_APPROVAL.data), DONE: flat(cols.DONE.data), FAILED_CANCELLED: flat(cols.FAILED_CANCELLED.data) }
  const tasks = new Map(Object.values(byCol).flat().map((t) => [t.id, t]))
  const projectsById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects])

  const doMove = (task: Task, to: KanbanColumnId, before: string | null) => {
    setBusy((s) => new Set(s).add(task.id))
    move.mutate({ task, toColumn: to, beforeTaskId: before }, { onSettled: () => setBusy((s) => { const n = new Set(s); n.delete(task.id); return n }) })
  }
  const askCancel = (task: Task) => setDlg({ kind: 'cancel', task })
  const askRedo = (task: Task, before: string | null) => setDlg({ kind: 'redo', task, before })
  const dnd = useBoardDnd({ tasks, columnIds: (c) => byCol[c].map((t) => t.id), onMove: doMove, onCancel: askCancel, onRedo: askRedo })

  const open = (t: Task) => {
    const a = t.status === 'AWAITING_APPROVAL' ? Object.values(approvals).find((x) => x.taskId === t.id && x.status === 'PENDING') : undefined
    if (a) useUiStore.getState().openInbox(a.id) // thẻ chờ duyệt: mở hộp thoại duyệt, không duyệt bằng kéo
    else f.set({ task: t.id })
  }
  const actions: CardActions = {
    open: (t) => f.set({ task: t.id }),
    moveTo: (t, col) => (col === 'QUEUED' && redoable(t) ? askRedo(t, null) : col === 'FAILED_CANCELLED' && cancellable(t) ? askCancel(t) : doMove(t, col, null)),
    assign: (t) => setDlg({ kind: 'assign', task: t }),
    setPriority: (t, p: Priority) => prio.mutate({ id: t.id, value: p }, { onSettled: refresh }),
    cancel: (t) => (t.status === 'RUNNING' ? askCancel(t) : cancel.mutate({ id: t.id, value: undefined }, { onSettled: refresh })),
    redo: (t) => askRedo(t, null),
  }

  // Nhóm theo hàng ngang (swimlane): không nhóm / theo agent / theo dự án
  const laneOf = (t: Task) => (f.group === 'agent' ? t.agentId : f.group === 'project' ? t.projectId ?? 'none' : 'all')
  const laneLabel = (id: string) => (f.group === 'agent' ? agents[id]?.name ?? id : projectsById.get(id)?.name ?? 'Không thuộc dự án')
  const lanes = f.group === 'none' ? ['all'] : [...new Set([...tasks.values()].map(laneOf))].sort((a, b) => laneLabel(a).localeCompare(laneLabel(b), 'vi'))

  const anyError = COLUMNS.some((c) => cols[c.id].isError)
  const loading = COLUMNS.some((c) => cols[c.id].isLoading)
  const grid = { gridTemplateColumns: `repeat(4, minmax(16rem, 1fr)) ${f.failedOpen ? 'minmax(16rem, 1fr)' : '3rem'}` }
  const total = (c: KanbanColumnId) => cols[c].data?.pages[0]?.total ?? 0
  const dragging = dnd.active

  return (
    <div className="relative flex h-full min-h-0 flex-col" role="region" aria-label="Bảng Kanban">
      {anyError && <ErrorBanner message="Không tải được bảng task." onRetry={() => COLUMNS.forEach((c) => void cols[c.id].refetch())} />}
      <DndContext sensors={dnd.sensors} collisionDetection={dnd.collision} onDragStart={dnd.onDragStart} onDragEnd={dnd.onDragEnd} onDragCancel={dnd.onDragCancel}
        accessibility={{ announcements: dnd.announcements, screenReaderInstructions: { draggable: 'Nhấn Space để nhấc thẻ, mũi tên để di chuyển, Space để thả, Esc để huỷ. Nhấn Enter để mở chi tiết.' } }}>
        <div className="min-h-0 flex-1 overflow-auto px-3 pb-24" aria-busy={loading}>
          <div className="min-w-[72rem]">
            <div className="sticky top-0 z-10 grid items-start gap-3 bg-slate-50 py-2" style={grid}>
              {COLUMNS.map((c) => (c.id === 'FAILED_CANCELLED' && !f.failedOpen ? (
                <button key={c.id} onClick={() => f.set({ failed: '1' })} aria-label={`Mở cột Lỗi / Huỷ (${total(c.id)})`} className="rounded-card border border-red-200 bg-red-50 px-1 py-2 text-xs font-semibold text-red-800 [writing-mode:vertical-rl]">Lỗi / Huỷ ({total(c.id)}) ▸</button>
              ) : (
                <div key={c.id} className="rounded-card px-3 py-2" style={{ background: c.soft, borderBottom: `3px solid ${c.color}` }}>
                  <div className="flex items-center gap-2 text-sm font-bold" style={{ color: c.color }}>{c.label}<span className="rounded-full bg-white px-2 text-xs tabular-nums">{total(c.id)}</span>
                    {c.id === 'FAILED_CANCELLED' && <button onClick={() => f.set({ failed: null })} className="ml-auto text-xs underline">Thu gọn</button>}</div>
                  {c.id === 'QUEUED' && <p className="text-xs text-slate-600">Kéo để đổi thứ tự (ảnh hưởng thứ tự chạy)</p>}
                </div>
              )))}
            </div>
            {loading && <div className="grid gap-3" style={grid}>{COLUMNS.map((c) => <div key={c.id} className="h-64 animate-pulse rounded-card bg-slate-200" />)}</div>}
            {!loading && lanes.map((lane, li) => (
              <section key={lane} aria-label={f.group === 'none' ? undefined : laneLabel(lane)} className="mb-3">
                {f.group !== 'none' && <h3 className="mb-1 mt-2 text-sm font-bold text-slate-700">{laneLabel(lane)}</h3>}
                <div className="grid items-start gap-3" style={grid}>
                  {COLUMNS.map((c) => {
                    if (c.id === 'FAILED_CANCELLED' && !f.failedOpen) return <div key={c.id} />
                    const list = byCol[c.id].filter((t) => laneOf(t) === lane || f.group === 'none')
                    const last = li === lanes.length - 1
                    const q = cols[c.id]
                    return (
                      <KanbanColumn key={c.id} col={c} lane={lane} tasks={list} dim={!!dragging && !hintAllows(dragging, c.id)}
                        renderCard={(t) => <SortableCard key={t.id} task={t} project={t.projectId ? projectsById.get(t.projectId) : undefined} now={now} pending={busy.has(t.id)} onOpen={() => open(t)} menu={<CardMenu task={t} actions={actions} />} />}
                        footer={last && q.hasNextPage ? <button onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage} className="mt-2 w-full rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-medium hover:bg-slate-50">{q.isFetchingNextPage ? 'Đang tải…' : `Tải thêm (${byCol[c.id].length}/${total(c.id)})`}</button> : undefined} />
                    )
                  })}
                </div>
              </section>
            ))}
            {!loading && COLUMNS.every((c) => total(c.id) === 0) && <p className="py-12 text-center text-sm text-slate-600">Không có task nào khớp bộ lọc. Hãy bỏ bớt bộ lọc hoặc giao việc mới (phím G tạo mục tiêu).</p>}
          </div>
        </div>
        {dragging && cancellable(dragging) && <CancelZone />}
        <DragOverlay>{dragging && <div className="rotate-2 shadow-2xl"><CardBody task={dragging} project={dragging.projectId ? projectsById.get(dragging.projectId) : undefined} now={now} /></div>}</DragOverlay>
      </DndContext>
      <BoardDialogs pending={dlg} close={() => setDlg(null)} onCancel={(t) => doMove(t, 'FAILED_CANCELLED', null)} onRedo={(t, b) => doMove(t, 'QUEUED', b)} />
    </div>
  )
}
