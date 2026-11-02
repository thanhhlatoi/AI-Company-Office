import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { usePendingMemory } from '../studio/queries'
import { CAPABILITY_NAV } from './navItems'

/** Menu "Năng lực" (desktop): gom Model / Công cụ / Kho tài liệu / Bộ nhớ / Mẫu agent. Mở bằng bàn phím, Esc đóng, bấm ra ngoài đóng. */
export function NavMenu() {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const pending = usePendingMemory().data ?? 0
  const active = CAPABILITY_NAV.some(([to]) => pathname.startsWith(to))
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey, true) }
  }, [open])
  return (
    <div ref={box} className="relative">
      <button aria-expanded={open} aria-controls="capability-menu" onClick={() => setOpen(!open)} className={`flex items-center gap-1 ${active ? 'text-brand' : 'text-slate-600'}`}>
        Năng lực<ChevronDown size={14} aria-hidden />{pending > 0 && <span aria-label={`${pending} ký ức chờ xem xét`} className="rounded-full bg-amber-700 px-1.5 text-xs font-bold text-white">{pending}</span>}
      </button>
      {open && (
        <ul id="capability-menu" className="absolute left-0 top-8 z-40 w-48 rounded-card border border-slate-200 bg-white p-1 text-sm shadow-xl">
          {CAPABILITY_NAV.map(([to, label]) => <li key={to}><NavLink to={to} onClick={() => setOpen(false)} className={({ isActive }) => `block rounded-lg px-3 py-2 ${isActive ? 'bg-brand/10 font-medium text-brand-dark' : 'text-slate-700 hover:bg-slate-50'}`}>{label}</NavLink></li>)}
        </ul>
      )}
    </div>
  )
}
