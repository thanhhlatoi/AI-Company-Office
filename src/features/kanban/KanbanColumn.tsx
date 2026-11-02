import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import type { Task } from '../../types'
import type { ColumnDef } from './columns'
import { colDropId } from './useBoardDnd'

/** Phần thân của một cột trong một làn: vùng thả + danh sách thẻ sắp xếp được. */
export function KanbanColumn({ col, lane, tasks, dim, renderCard, footer }: { col: ColumnDef; lane: string; tasks: Task[]; dim: boolean; renderCard: (t: Task) => ReactNode; footer?: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: colDropId(col.id, lane) })
  return (
    <div ref={setNodeRef} role="group" aria-label={`Cột ${col.label}`} style={{ background: col.soft }}
      className={`min-h-20 rounded-card p-2 transition-opacity ${isOver ? 'ring-4 ring-brand/40' : ''} ${dim ? 'opacity-50 [outline:2px_dashed_#94a3b8]' : ''}`}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">{tasks.map(renderCard)}</ul>
      </SortableContext>
      {tasks.length === 0 && <p className="py-3 text-center text-xs text-slate-600">Trống</p>}
      {footer}
    </div>
  )
}
