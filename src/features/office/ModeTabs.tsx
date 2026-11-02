import { Filter, Route } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSettingsStore } from '../../store/settingsStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useUiStore, type StatusFilter } from '../../store/uiStore'
import { useRouteView } from './useRouteView'

/** Hai chế độ của canvas: "Toàn công ty" / "Trong phòng" (vào phòng đang xem, phòng xem gần nhất, hoặc phòng đầu tiên). */
const FILTERS: [StatusFilter, string][] = [['all', 'Tất cả'], ['WORKING', 'Đang làm'], ['ERROR', 'Lỗi']]

export function ModeTabs() {
  const filter = useUiStore((s) => s.statusFilter)
  const setFilter = useUiStore((s) => s.setStatusFilter)
  const panelOpen = useUiStore((s) => s.deptPanelOpen)
  const setPanel = useUiStore((s) => s.setDeptPanel)
  const [menuOpen, setMenuOpen] = useState(false)
  const showHandoff = useSettingsStore((s) => s.showHandoff)
  const menuBox = useRef<HTMLDivElement>(null)
  const { slug } = useRouteView()
  const last = useUiStore((s) => s.lastDepartmentSlug)
  const first = useDepartmentStore((s) => Object.values(s.departmentsById).sort((a, b) => a.order - b.order)[0]?.slug)
  const inNetwork = useLocation().pathname === '/network'
  const inRoom = !!slug
  const roomTarget = slug ?? last ?? first

  // Menu "Lọc" (dưới 1024px): đóng khi bấm ra ngoài hoặc Esc (Esc chỉ đóng menu, không đóng panel)
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => { if (!menuBox.current?.contains(e.target as Node)) setMenuOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setMenuOpen(false) } }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey, true) }
  }, [menuOpen])

  const tab = (active: boolean) =>
    `flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-lg px-4 text-sm font-medium lg:min-h-0 lg:py-1.5 ${active ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`
  const activeLabel = FILTERS.find(([k]) => k === filter)?.[1]
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 lg:px-3">
      {/* Một hàng duy nhất: thiếu chỗ thì cuộn ngang trong vùng này, không xuống dòng */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Chế độ xem" className="flex gap-1">
          <Link role="tab" aria-selected={!inRoom && !inNetwork} to="/company" className={tab(!inRoom && !inNetwork)}>Toàn công ty</Link>
          {roomTarget
            ? <Link role="tab" aria-selected={inRoom} to={`/department/${roomTarget}`} className={tab(inRoom)}>Trong phòng</Link>
            : <span role="tab" aria-selected={false} aria-disabled="true" className={`${tab(false)} opacity-50`}>Trong phòng</span>}
          <Link role="tab" aria-selected={inNetwork} to="/network" className={tab(inNetwork)}>Sơ đồ mạng</Link>
        </div>
        {inRoom && (
          <button onClick={() => setPanel(!panelOpen)} aria-pressed={panelOpen} className="min-h-10 shrink-0 whitespace-nowrap rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50 aria-pressed:bg-slate-100 lg:min-h-0 lg:py-1.5">
            Thông tin phòng
          </button>
        )}
      </div>
      {!inNetwork && (
        <>
          <button onClick={() => useSettingsStore.getState().update({ showHandoff: !showHandoff })} aria-pressed={showHandoff} title="Bật/tắt đường giao việc"
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50 aria-pressed:border-brand aria-pressed:bg-brand/10 aria-pressed:font-medium aria-pressed:text-brand-dark lg:min-h-0 lg:py-1.5">
            <Route size={16} aria-hidden="true" /> <span className="hidden xl:inline">Đường giao việc</span><span className="sr-only xl:hidden">Đường giao việc</span>
          </button>
          <div role="group" aria-label="Lọc theo trạng thái" className="hidden shrink-0 gap-1 text-sm lg:flex">
            <span className="self-center pr-1 text-slate-600">Lọc:</span>
            {FILTERS.map(([key, label]) => (
              <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1 ${filter === key ? 'border-brand bg-brand/10 font-medium text-brand-dark' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </div>
          {/* Dưới 1024px: gom bộ lọc vào một nút "Lọc" mở menu nhỏ */}
          <div ref={menuBox} className="relative shrink-0 lg:hidden">
            <button
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm ${filter === 'all' ? 'border-slate-300 text-slate-600' : 'border-brand bg-brand/10 font-medium text-brand-dark'}`}
            >
              <Filter size={16} /> {filter === 'all' ? 'Lọc' : activeLabel}
            </button>
            {menuOpen && (
              <div role="menu" aria-label="Lọc theo trạng thái" className="absolute right-0 top-12 z-40 w-44 rounded-card border border-slate-200 bg-white p-1 text-sm shadow-xl">
                {FILTERS.map(([key, label]) => (
                  <button key={key} role="menuitemradio" aria-checked={filter === key} onClick={() => { setFilter(key); setMenuOpen(false) }}
                    className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left ${filter === key ? 'bg-brand/10 font-medium text-brand-dark' : 'hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
