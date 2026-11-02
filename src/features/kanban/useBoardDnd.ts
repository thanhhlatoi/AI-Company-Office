import { KeyboardSensor, MouseSensor, type KeyboardCoordinateGetter, type UniqueIdentifier, TouchSensor, closestCorners, pointerWithin, useSensor, useSensors, type Announcements, type CollisionDetection, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useEffect, useRef, useState } from 'react'
import { useUiStore } from '../../store/uiStore'
import type { Task } from '../../types'
import type { KanbanColumnId } from '../../types/kanban'
import { cancellable, columnLabel, columnOf, redoable } from './columns'

export const CANCEL_ZONE = 'cancel-zone'
/** id vùng thả của một cột (kèm làn khi nhóm theo hàng ngang): `col:QUEUED|laneId` */
export const colDropId = (col: KanbanColumnId, lane: string) => `col:${col}|${lane}`

interface Opts {
  tasks: Map<string, Task>
  /** id thẻ đang hiện trong cột, theo thứ tự (để tính vị trí thả khi đổi chỗ) */
  columnIds: (col: KanbanColumnId) => string[]
  onMove: (t: Task, col: KanbanColumnId, before: string | null) => void
  onCancel: (t: Task) => void
  onRedo: (t: Task, before: string | null) => void
}

/** Bàn phím: mũi tên lên/xuống chỉ nhảy giữa các THẺ (không nhảy vào vùng cột), trái/phải mới sang cột khác. */
const coordinateGetter: KeyboardCoordinateGetter = (event, args) => {
  if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown') return sortableKeyboardCoordinates(event, args)
  const map = args.context.droppableContainers
  // sortableKeyboardCoordinates chỉ dùng getEnabled() và get(id) của bản đồ vùng thả (Map thật không bọc được bằng prototype)
  const cardsOnly = { getEnabled: () => map.getEnabled().filter((c) => !String(c.id).startsWith('col:') && c.id !== CANCEL_ZONE), get: (id: UniqueIdentifier) => map.get(id) } as unknown as typeof map
  return sortableKeyboardCoordinates(event, { ...args, context: { ...args.context, droppableContainers: cardsOnly } })
}

/** Logic kéo thả. FE chỉ GỢI Ý: mọi lần thả hợp lệ về mặt thao tác đều gửi cho BE, BE từ chối bằng 409. */
export function useBoardDnd(o: Opts) {
  const [active, setActive] = useState<Task | null>(null) // ảnh chụp thẻ lúc bắt đầu kéo (status lúc đó dùng để phát hiện đổi trạng thái)
  const staleCancel = useRef(false)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), // kéo ít nhất 6px mới tính là kéo (còn lại là bấm)
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }), // Enter dành cho "mở chi tiết"
  )
  const collision: CollisionDetection = (args) => {
    const zone = pointerWithin(args).find((c) => c.id === CANCEL_ZONE)
    return zone ? [zone] : closestCorners(args)
  }

  // Thẻ đang kéo bị sự kiện đổi trạng thái ở nơi khác: huỷ thao tác kéo (giả lập phím Esc, dnd-kit tự dọn và gọi onDragCancel)
  const live = active ? o.tasks.get(active.id) : undefined
  const stale = !!active && live?.status !== active.status
  useEffect(() => {
    if (!stale) return
    staleCancel.current = true
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }))
  }, [stale])

  const target = (overId: string) => {
    if (overId === CANCEL_ZONE) return 'cancel' as const
    if (overId.startsWith('col:')) return { col: overId.slice(4).split('|')[0] as KanbanColumnId, before: null as string | null, onCard: false }
    const t = o.tasks.get(overId)
    return t ? { col: columnOf(t.status), before: t.id as string | null, onCard: true } : null
  }

  const onDragStart = (e: DragStartEvent) => {
    const t = o.tasks.get(String(e.active.id)) ?? null
    staleCancel.current = false
    setActive(t)
  }
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null)
    const task = o.tasks.get(String(e.active.id))
    const tg = e.over ? target(String(e.over.id)) : null
    if (!task || !tg) return
    if (tg === 'cancel') return cancellable(task) ? o.onCancel(task) : undefined
    const from = columnOf(task.status)
    if (tg.col === from) { // thả cùng cột: chỉ cột Chờ đổi thứ tự được
      if (from !== 'QUEUED' || !tg.onCard || tg.before === task.id) return
      const ids = o.columnIds('QUEUED')
      const down = ids.indexOf(task.id) < ids.indexOf(tg.before as string) // kéo xuống thì đứng SAU thẻ đích
      return o.onMove(task, 'QUEUED', down ? ids[ids.indexOf(tg.before as string) + 1] ?? null : tg.before)
    }
    if (tg.col === 'QUEUED' && redoable(task)) return o.onRedo(task, tg.before)
    if (tg.col === 'FAILED_CANCELLED' && cancellable(task)) return o.onCancel(task)
    o.onMove(task, tg.col, tg.onCard ? tg.before : null)
  }
  const onDragCancel = () => {
    setActive(null)
    if (staleCancel.current) useUiStore.getState().toast('Thẻ vừa đổi trạng thái ở nơi khác, đã huỷ thao tác kéo.', 'error')
    staleCancel.current = false
  }

  const name = (id: unknown) => `"${o.tasks.get(String(id))?.title ?? 'thẻ'}"`
  const where = (id: unknown) => { const t = target(String(id)); return t === 'cancel' ? 'vùng Huỷ' : t ? `${t.onCard ? `vị trí của thẻ ${name(id)} trong ` : ''}cột ${columnLabel(t.col)}` : 'ngoài bảng' }
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Đã nhấc thẻ ${name(a.id)}. Dùng mũi tên để di chuyển, Space để thả, Esc để huỷ.`,
    onDragOver: ({ active: a, over }) => (over ? `Thẻ ${name(a.id)} đang ở ${where(over.id)}.` : `Thẻ ${name(a.id)} đang ở ngoài bảng.`),
    onDragEnd: ({ active: a, over }) => (over ? `Đã thả thẻ ${name(a.id)} vào ${where(over.id)}. Đang chờ hệ thống xác nhận.` : `Đã thả thẻ ${name(a.id)} ra ngoài bảng, không đổi gì.`),
    onDragCancel: ({ active: a }) => `Đã huỷ kéo thẻ ${name(a.id)}.`,
  }
  return { sensors, collision, announcements, active: stale ? null : active, onDragStart, onDragEnd, onDragCancel }
}
