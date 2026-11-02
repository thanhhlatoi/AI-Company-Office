import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useUiStore } from '../../store/uiStore'
import { useUnreadCount } from './hooks'

/** Chuông "Thông báo" (thông tin). Khác với chuông "Cần xử lý" (phê duyệt, chờ ngân sách). */
export function NotifyBell() {
  const count = useUnreadCount().data ?? 0
  const open = useUiStore((s) => s.notifPanel)
  const prev = useRef(count)
  const [ring, setRing] = useState(false)
  useEffect(() => {
    if (count > prev.current) { setRing(true); const t = setTimeout(() => setRing(false), 2600); prev.current = count; return () => clearTimeout(t) }
    prev.current = count
  }, [count])
  return (
    <button aria-label={`Thông báo: ${count} chưa đọc`} aria-pressed={open} onClick={() => (open ? useUiStore.getState().closeNotifs() : useUiStore.getState().openNotifs())}
      className={`relative rounded-lg border p-2 hover:bg-slate-50 ${count ? 'border-sky-400 text-sky-700' : 'border-slate-300 text-slate-600'} ${open ? 'bg-slate-100' : ''}`}>
      <Bell size={18} className={ring ? 'bell-ring' : ''} aria-hidden="true" />
      {count > 0 && <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-sky-700 px-1 text-xs font-bold leading-5 text-white">{count > 99 ? '99+' : count}</span>}
    </button>
  )
}
