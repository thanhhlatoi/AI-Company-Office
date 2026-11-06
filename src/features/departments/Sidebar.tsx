import { Building2, ChevronsLeft, ChevronsRight, Plus, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DepartmentIcon } from '../../components/DepartmentIcon'
import { INFRA_SLUG } from '../../config/departments'
import { useDepartmentStore } from '../../store/departmentStore'
import { useDeviceStore } from '../../store/deviceStore'
import { statsOf, useAgentsByDepartment, useCompanyStats } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { useRouteView } from '../office/useRouteView'

interface RowProps { to: string; label: string; active: boolean; icon: ReactNode; dot?: string; working: number; total: number; error: number; collapsed: boolean; alert?: number }

function Row({ to, label, active, icon, dot, working, total, error, collapsed, alert = 0 }: RowProps) {
  // Màn hình hẹp (<1024px) luôn thu về icon; màn rộng thì theo nút thu gọn
  const text = collapsed ? 'hidden' : 'hidden lg:flex'
  return (
    <Link
      to={to}
      title={label}
      aria-label={`${label}: ${working} đang làm trên ${total}${error ? `, ${error} lỗi` : ''}${alert ? `, ${alert} cảnh báo thiết bị` : ''}`}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-card px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand ${active ? 'bg-brand/10 font-semibold text-brand-dark' : 'text-slate-700 hover:bg-slate-100'}`}
    >
      <span className="relative shrink-0">
        {icon}
        {alert > 0 && <TriangleAlert size={14} aria-hidden="true" className="absolute -left-2 -top-2 rounded-full bg-white text-amber-600" />}
        {error > 0 && (
          <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">{error}</span>
        )}
      </span>
      <span className={`${text} min-w-0 flex-1 items-center gap-2`}>
        <span className="flex-1 truncate">{label}</span>
        {dot && <span className="size-2.5 shrink-0 rounded-full" style={{ background: dot }} />}
        <span className="tabular-nums text-xs text-slate-600">{working}/{total}</span>
      </span>
    </Link>
  )
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const departments = useDepartmentStore((s) => s.departmentsById)
  const byDept = useAgentsByDepartment()
  const company = useCompanyStats()
  const alertCount = useDeviceStore((s) => Object.keys(s.alerts).length)
  const { slug } = useRouteView()
  const { pathname } = useLocation()
  const list = Object.values(departments).sort((a, b) => a.order - b.order)

  return (
    <nav aria-label="Phòng ban" className={`flex shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-2 ${collapsed ? 'w-16' : 'w-16 lg:w-60'}`}>
      <Row to="/company" label="Toàn công ty" active={pathname === '/company'} icon={<Building2 size={20} />}
        working={company.working} total={company.total} error={company.error} collapsed={collapsed} />
      <div className="my-1 h-px bg-slate-100" />
      {list.map((d) => {
        const s = statsOf(byDept[d.id] ?? [])
        return (
          <Row key={d.id} to={`/department/${d.slug}`} label={d.name} active={slug === d.slug} icon={<DepartmentIcon name={d.icon} size={20} />}
            dot={d.color} working={s.working} total={s.total} error={s.error} collapsed={collapsed} alert={d.slug === INFRA_SLUG ? alertCount : 0} />
        )
      })}
      <button
        onClick={() => useUiStore.getState().openDeptForm()}
        aria-label="Tạo phòng ban"
        title="Tạo phòng ban"
        className="flex items-center gap-3 rounded-card px-3 py-2 text-sm text-brand-dark hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Plus size={20} className="shrink-0" aria-hidden="true" />
        <span className={collapsed ? 'hidden' : 'hidden lg:inline'}>Tạo phòng ban</span>
      </button>
      <button
        onClick={toggle}
        aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        className="mt-auto hidden items-center gap-2 rounded-card px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 lg:flex"
      >
        {collapsed ? <ChevronsRight size={18} /> : <><ChevronsLeft size={18} /> Thu gọn</>}
      </button>
    </nav>
  )
}
