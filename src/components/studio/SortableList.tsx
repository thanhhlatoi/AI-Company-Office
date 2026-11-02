import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'

export interface SortItem { id: string; node: ReactNode }

function Row({ item }: { item: SortItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 ${isDragging ? 'z-10 shadow-lg' : ''}`}>
      <button type="button" aria-label="Kéo để sắp xếp (hoặc Space rồi phím mũi tên)" className="cursor-grab touch-none rounded p-1 text-slate-600 hover:bg-slate-100" {...attributes} {...listeners}><GripVertical size={16} /></button>
      <div className="min-w-0 flex-1">{item.node}</div>
    </li>
  )
}

/** Danh sách kéo sắp xếp được bằng chuột, cảm ứng và bàn phím. `onChange` nhận thứ tự id mới. */
export function SortableList({ items, onChange, label }: { items: SortItem[]; onChange: (ids: string[]) => void; label: string }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const ids = items.map((i) => i.id)
  const end = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    onChange(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul aria-label={label} className="space-y-1.5">{items.map((i) => <Row key={i.id} item={i} />)}</ul>
      </SortableContext>
    </DndContext>
  )
}
