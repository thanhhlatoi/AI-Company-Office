import { Plus, Search } from 'lucide-react'
import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { SystemButton } from '../system/SystemControls'
import { NotifyBell } from '../notifications/NotifyBell'
import { ApprovalBell } from '../approvals/ApprovalBell'
import { CountUp } from '../../components/CountUp'
import { MobileNav } from './MobileNav'
import { NavMenu } from './NavMenu'
import { SettingsMenu } from './SettingsMenu'
import { useAgentStore } from '../../store/agentStore'
import { useRealtimeStore } from '../../store/realtimeStore'
import { useUiStore } from '../../store/uiStore'
import { useWorkStore } from '../../store/workStore'

export function TopBar() {
  const agentsById = useAgentStore((s) => s.agentsById)
  const awaiting = useWorkStore((s) => Object.values(s.goalsById).filter((g) => g.status === 'AWAITING_PLAN_APPROVAL').length)
  const connection = useRealtimeStore((s) => s.connectionState)
  const openForm = useUiStore((s) => s.openForm)
  const { pathname } = useLocation()
  const c = useMemo(() => {
    const list = Object.values(agentsById)
    return {
      working: list.filter((a) => a.status === 'WORKING').length,
      idle: list.filter((a) => a.status === 'IDLE').length,
      error: list.filter((a) => a.status === 'ERROR' || a.status === 'BLOCKED').length,
    }
  }, [agentsById])
  const ok = connection === 'connected'
  // Chi phí token hôm nay: BE chưa có -> chưa hiển thị (docs/MISSING_API.md)
  const label = `Đang làm ${c.working}, rảnh ${c.idle}, lỗi ${c.error}`
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-1 border-b border-slate-200 bg-white px-4">
      <nav className="flex shrink-0 items-center gap-2.5 text-sm lg:gap-4">
        {/* Dưới 1024px: chỉ còn "AO" (chấm kết nối gắn vào đây) + menu; từ 1024px: tên đầy đủ + link */}
        <span className="relative font-semibold text-brand-dark" title={ok ? 'Đã kết nối' : 'Mất kết nối'}>
          <span className="lg:hidden">AO</span>
          <span className="hidden whitespace-nowrap lg:inline">AI Company Office</span>
          <span role="img" aria-label={ok ? 'Đã kết nối realtime' : 'Mất kết nối realtime'} className={`absolute -right-1.5 -top-0.5 size-2.5 rounded-full lg:hidden ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
        </span>
        <div className="hidden gap-4 lg:flex">
          <NavLink to="/company" className={({ isActive }) => (isActive || pathname.startsWith('/department') ? 'text-brand' : 'text-slate-600')}>Công ty</NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'text-brand' : 'text-slate-600')}>Dashboard</NavLink>
          <NavLink to="/history" className={({ isActive }) => (isActive ? 'text-brand' : 'text-slate-600')}>Hội thoại</NavLink>
          <NavMenu />
          <NavLink to="/costs" className={({ isActive }) => (isActive ? 'text-brand' : 'text-slate-600')}>Chi phí</NavLink>
          <NavLink to="/projects" className={({ isActive }) => (isActive ? 'text-brand' : 'text-slate-600')}>Dự án</NavLink>
          <NavLink to="/kanban" className={({ isActive }) => (isActive ? 'text-brand' : 'text-slate-600')}>Bảng task</NavLink>
          <NavLink to="/goals" className={({ isActive }) => (isActive ? 'text-brand' : 'text-slate-600')}>Mục tiêu{awaiting > 0 && <span aria-label={`${awaiting} kế hoạch chờ duyệt`} className="ml-1 rounded-full bg-amber-700 px-1.5 text-xs font-bold text-white">{awaiting}</span>}</NavLink>
        <NavLink to="/agents" end className={({ isActive }) => (isActive ? 'text-brand' : 'text-slate-600')}>Danh sách</NavLink>
        </div>
        <MobileNav />
      </nav>
      {/* Số liệu: đầy đủ từ 1024px, chip gọn "▶2 · ✓33 · ✕0" ở dưới đó */}
      <div className="hidden gap-6 whitespace-nowrap text-sm lg:flex" aria-live="polite">
        <span>Đang làm: <b className="text-yellow-700"><CountUp value={c.working} /></b></span>
        <span>Rảnh: <b className="text-green-700"><CountUp value={c.idle} /></b></span>
        <span>Lỗi: <b className="text-red-600"><CountUp value={c.error} /></b></span>
      </div>
      <div role="group" aria-label={label} className="flex min-w-0 shrink items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium lg:hidden">
        <span aria-hidden="true" className="text-yellow-700">▶{c.working}</span>
        <span aria-hidden="true" className="text-green-700">✓{c.idle}</span>
        <span aria-hidden="true" className="text-red-700">✕{c.error}</span>
      </div>
      {/* Mọi nút: vùng bấm tối thiểu 40x40px dưới 1024px */}
      <div className="flex shrink-0 items-center gap-1 lg:gap-3 [&_button]:min-h-10 [&_button]:min-w-10 lg:[&_button]:min-h-0 lg:[&_button]:min-w-0">
        <button
          aria-label="Tìm kiếm (Ctrl+K)"
          onClick={() => useUiStore.getState().setPalette(true)}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-2 text-sm text-slate-600 hover:bg-slate-50 lg:px-3 lg:py-1.5"
        >
          <Search size={16} /> <span className="hidden lg:inline">Tìm…</span>
          <kbd className="hidden rounded bg-slate-100 px-1.5 text-xs lg:inline">Ctrl K</kbd>
        </button>
        <button aria-label="Phím tắt (?)" title="Phím tắt (?)" onClick={() => useUiStore.getState().setShortcuts(true)} className="hidden rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50 sm:block">?</button>
        <SystemButton />
        <ApprovalBell />
        <NotifyBell />
        <SettingsMenu />
        <button
          aria-label="Thêm agent"
          onClick={() => openForm()}
          className="flex items-center justify-center gap-1 rounded-lg bg-brand px-2 text-sm text-white hover:bg-brand-dark lg:px-3 lg:py-1.5"
        >
          <Plus size={16} /> <span className="hidden lg:inline">Thêm agent</span>
        </button>
        <span
          role="img"
          aria-label={ok ? 'Đã kết nối realtime' : 'Mất kết nối realtime'}
          title={ok ? 'Đã kết nối' : 'Mất kết nối'}
          className={`hidden size-3 rounded-full lg:block ${ok ? 'bg-green-500' : 'bg-red-500'}`}
        />
      </div>
    </header>
  )
}
