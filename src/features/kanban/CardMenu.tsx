import { Ellipsis } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Priority, Task } from '../../types'
import type { KanbanColumnId } from '../../types/kanban'
import { PRIORITY_STYLE } from '../goals/style'
import { COLUMNS, cancellable, columnOf, redoable } from './columns'

export interface CardActions {
  open: (t: Task) => void
  moveTo: (t: Task, col: KanbanColumnId) => void
  assign: (t: Task) => void
  setPriority: (t: Task, p: Priority) => void
  cancel: (t: Task) => void
  redo: (t: Task) => void
}

const ITEM = 'flex min-h-9 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none'

/** Menu "…" của thẻ: lối thay thế cho kéo thả (cảm ứng / bàn phím). */
export function CardMenu({ task, actions }: { task: Task; actions: CardActions }) {
  const [open, setOpen] = useState(false)
  const [sub, setSub] = useState<'cols' | 'prio' | null>(null)
  const box = useRef<HTMLSpanElement>(null)
  const stop = { onPointerDown: (e: React.SyntheticEvent) => e.stopPropagation(), onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(), onClick: (e: React.SyntheticEvent) => e.stopPropagation(), onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation() }
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', down); window.addEventListener('keydown', key, true)
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('keydown', key, true) }
  }, [open])
  const run = (fn: () => void) => () => { setOpen(false); setSub(null); fn() }
  const from = columnOf(task.status)
  const locked = task.locked || task.status === 'AWAITING_APPROVAL'
  return (
    <span ref={box} className="relative shrink-0" {...stop}>
      <button aria-label={`Thao tác cho ${task.title}`} aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(!open); setSub(null) }} className="grid size-6 place-items-center rounded hover:bg-slate-100"><Ellipsis size={16} /></button>
      {open && (
        <div role="menu" aria-label="Thao tác thẻ" className="absolute right-0 top-7 z-30 w-52 rounded-card border border-slate-200 bg-white p-1 shadow-xl">
          {sub === 'cols' ? COLUMNS.filter((c) => c.id !== from).map((c) => <button key={c.id} role="menuitem" autoFocus={false} onClick={run(() => actions.moveTo(task, c.id))} className={ITEM}>{c.label}</button>)
            : sub === 'prio' ? (Object.keys(PRIORITY_STYLE) as Priority[]).map((p) => <button key={p} role="menuitemradio" aria-checked={task.priority === p} onClick={run(() => actions.setPriority(task, p))} className={ITEM}>{PRIORITY_STYLE[p].mark} {PRIORITY_STYLE[p].label}</button>)
            : (
              <>
                <button role="menuitem" onClick={run(() => actions.open(task))} className={ITEM}>Xem chi tiết</button>
                {!locked && <button role="menuitem" aria-haspopup="menu" onClick={() => setSub('cols')} className={ITEM}>Chuyển tới cột…</button>}
                <button role="menuitem" onClick={run(() => actions.assign(task))} className={ITEM}>Đổi người phụ trách…</button>
                {!locked && <button role="menuitem" aria-haspopup="menu" onClick={() => setSub('prio')} className={ITEM}>Đổi ưu tiên…</button>}
                {redoable(task) && <button role="menuitem" onClick={run(() => actions.redo(task))} className={ITEM}>Làm lại (tạo task mới)</button>}
                {cancellable(task) && <button role="menuitem" onClick={run(() => actions.cancel(task))} className={`${ITEM} text-red-700`}>Huỷ</button>}
              </>
            )}
        </div>
      )}
    </span>
  )
}
