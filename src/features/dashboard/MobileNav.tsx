import { Menu } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CAPABILITY_NAV } from './navItems'

/** Dưới 1024px: các link Công ty / Danh sách thu vào một menu. */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey, true) }
  }, [open])

  const link = ({ isActive }: { isActive: boolean }) => `block rounded-lg px-3 py-2.5 ${isActive ? 'bg-brand/10 font-medium text-brand-dark' : 'text-slate-700 hover:bg-slate-50'}`
  return (
    <div ref={box} className="relative lg:hidden">
      <button aria-label="Mở menu điều hướng" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-10 min-w-10 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
        <Menu size={18} />
      </button>
      {open && (
        <nav aria-label="Điều hướng" className="absolute left-0 top-12 z-40 max-h-[80vh] w-48 overflow-y-auto rounded-card border border-slate-200 bg-white p-1 text-sm shadow-xl">
          <NavLink to="/company" onClick={() => setOpen(false)} className={() => link({ isActive: pathname === '/company' || pathname.startsWith('/department') || pathname === '/network' })}>Công ty</NavLink>
          <NavLink to="/dashboard" onClick={() => setOpen(false)} className={link}>Dashboard</NavLink>
          <NavLink to="/history" onClick={() => setOpen(false)} className={link}>Hội thoại</NavLink>
          <p className="px-3 pb-0.5 pt-2 text-xs font-semibold uppercase text-slate-600">Năng lực</p>
          {CAPABILITY_NAV.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={link}>{label}</NavLink>)}
          <p className="px-3 pb-0.5 pt-2 text-xs font-semibold uppercase text-slate-600">Công việc</p>
          <NavLink to="/costs" onClick={() => setOpen(false)} className={link}>Chi phí</NavLink>
          <NavLink to="/projects" onClick={() => setOpen(false)} className={link}>Dự án</NavLink>
          <NavLink to="/kanban" onClick={() => setOpen(false)} className={link}>Bảng task</NavLink>
          <NavLink to="/goals" onClick={() => setOpen(false)} className={link}>Mục tiêu</NavLink>
          <NavLink to="/agents" end onClick={() => setOpen(false)} className={link}>Danh sách</NavLink>
        </nav>
      )}
    </div>
  )
}
