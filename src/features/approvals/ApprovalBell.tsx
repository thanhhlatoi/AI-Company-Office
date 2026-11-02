import { ClipboardCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useUiStore } from '../../store/uiStore'
import { useBlockedBudgets } from '../costs/hooks'
import { usePendingCount } from './hooks'
import { usePendingMemory } from '../studio/queries'

/** Nút "Cần xử lý" ở thanh trên: số yêu cầu đang chờ duyệt; rung nhẹ khi có yêu cầu mới (tắt khi giảm chuyển động, xem index.css). */
export function ApprovalBell() {
  const approvals = usePendingCount()
  const budgets = useBlockedBudgets().data?.length ?? 0
  const memory = usePendingMemory().data ?? 0
  const count = approvals + budgets + memory // "Cần xử lý" gộp yêu cầu duyệt, ngân sách đang chặn việc và ký ức chờ xem xét
  const open = useUiStore((s) => s.inbox.open)
  const prev = useRef(count)
  const [ring, setRing] = useState(false)
  useEffect(() => {
    if (count > prev.current) { setRing(true); const t = setTimeout(() => setRing(false), 2600); prev.current = count; return () => clearTimeout(t) }
    prev.current = count
  }, [count])
  return (
    <button
      aria-label={`Cần xử lý: ${count} (${approvals} yêu cầu duyệt, ${budgets} ngân sách chặn việc, ${memory} ký ức chờ xem xét) (phím A)`}
      aria-pressed={open}
      onClick={() => (open ? useUiStore.getState().closeInbox() : useUiStore.getState().openInbox())}
      className={`relative rounded-lg border p-2 hover:bg-slate-50 ${count ? 'border-amber-400 text-amber-700' : 'border-slate-300 text-slate-600'} ${open ? 'bg-slate-100' : ''}`}
    >
      <ClipboardCheck size={18} className={ring ? 'bell-ring' : ''} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-xs font-bold leading-5 text-white">{count}</span>
      )}
    </button>
  )
}
