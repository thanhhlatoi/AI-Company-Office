import { KanbanBoard } from '../features/kanban/KanbanBoard'
import { KanbanToolbar } from '../features/kanban/KanbanToolbar'
import { useBoardFilters } from '../features/kanban/filters'
import { TaskDrawer } from '../features/kanban/TaskDrawer'

/** /kanban — bảng task toàn công ty. `?task=ID` mở ngăn chi tiết. */
export default function KanbanPage() {
  const f = useBoardFilters()
  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 pt-3"><h1 className="text-xl font-bold">Bảng task</h1></div>
        <KanbanToolbar />
        <div className="min-h-0 flex-1 bg-slate-50"><KanbanBoard /></div>
      </div>
      {f.taskId && <TaskDrawer key={f.taskId} id={f.taskId} onClose={() => f.set({ task: null })} />}
    </div>
  )
}
