import { Target } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { Suspense } from 'react'
import { ShortcutsDialog } from '../features/dashboard/ShortcutsDialog'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AgentFormModal } from '../features/agents/AgentFormModal'
import { AgentPanel } from '../features/agents/AgentPanel'
import { useAgentsQuery } from '../features/agents/hooks'
import { TopBar } from '../features/dashboard/TopBar'
import { CommandPalette } from '../features/dashboard/CommandPalette'
import { DepartmentFormModal } from '../features/departments/DepartmentFormModal'
import { DepartmentPanel } from '../features/departments/DepartmentPanel'
import { Sidebar } from '../features/departments/Sidebar'
import { useRouteView } from '../features/office/useRouteView'
import { useAgentStore } from '../store/agentStore'
import { SystemBar } from '../features/system/SystemControls'
import { GoalComposer } from '../features/goals/GoalComposer'
import { NotificationPanel } from '../features/notifications/NotificationPanel'
import { ApprovalInbox } from '../features/approvals/ApprovalInbox'
import { DevicePanel } from '../features/devices/DevicePanel'
import { useDepartmentStore } from '../store/departmentStore'
import { useDeviceStore } from '../store/deviceStore'
import { useRealtimeStore } from '../store/realtimeStore'
import { useUiStore } from '../store/uiStore'
import { ErrorBanner } from './ErrorBanner'
import { ToastHost } from './ToastHost'

export default function AppLayout() {
  const q = useAgentsQuery()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { slug, agentId } = useRouteView()
  const selectedId = useAgentStore((s) => s.selectedAgentId)
  const select = useAgentStore((s) => s.select)
  const departments = useDepartmentStore((s) => s.departmentsById)
  const connection = useRealtimeStore((s) => s.connectionState)
  const dept = slug ? Object.values(departments).find((d) => d.slug === slug) : undefined
  const loaded = Object.keys(departments).length > 0
  const deptPanelOpen = useUiStore((s) => s.deptPanelOpen)
  const deviceId = useDeviceStore((s) => s.selectedId)
  const inboxOpen = useUiStore((s) => s.inbox.open)
  const notifOpen = useUiStore((s) => s.notifPanel)
  const composerOpen = useUiStore((s) => s.composer.open)

  // URL -> store: phòng đang xem (camera) và agent đang chọn (panel)
  useEffect(() => { useUiStore.getState().setFocusDepartment(dept?.id ?? null) }, [dept?.id])
  useEffect(() => { if (slug) useUiStore.getState().rememberDepartment(slug) }, [slug])
  useEffect(() => { select(agentId ?? null) }, [agentId, select])
  // Slug không tồn tại (sau khi đã tải phòng ban) -> về toàn công ty
  useEffect(() => { if (slug && loaded && !dept) navigate('/company', { replace: true }) }, [slug, loaded, dept, navigate])

  // Chọn agent thì panel thiết bị và hộp thư duyệt đóng; mở hộp thư thì bỏ chọn thiết bị (chỉ một ngăn phải)
  useEffect(() => { if (agentId) { useDeviceStore.getState().select(null); useUiStore.getState().closeInbox(); useUiStore.getState().closeNotifs() } }, [agentId])
  useEffect(() => { if (inboxOpen || notifOpen) useDeviceStore.getState().select(null) }, [inboxOpen, notifOpen])
  useEffect(() => { if (deviceId) { useUiStore.getState().closeInbox(); useUiStore.getState().closeNotifs() } }, [deviceId])

  // Ra khỏi phòng thì panel phòng ban đóng (vào phòng khác sẽ không tự bật lại)
  useEffect(() => { if (!slug) useUiStore.getState().setDeptPanel(false) }, [slug])

  // Esc / nút đóng: agent đang mở -> về phòng; không thì đóng panel phòng ban
  const close = useCallback(() => {
    if (useUiStore.getState().notifPanel) useUiStore.getState().closeNotifs()
    else if (useUiStore.getState().inbox.open) useUiStore.getState().closeInbox()
    else if (useDeviceStore.getState().selectedId) useDeviceStore.getState().select(null)
    else if (agentId && slug) navigate(`/department/${slug}`)
    else if (useUiStore.getState().deptPanelOpen) useUiStore.getState().setDeptPanel(false)
    else select(null)
  }, [agentId, slug, navigate, select])

  // Phím tắt: Esc đóng panel (nếu có modal thì modal tự xử lý); 1-9 nhảy tới phòng, 0 về toàn công ty
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role=dialog]')) return close()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); useUiStore.getState().setPalette(true); return }
      const t = e.target as HTMLElement
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return
      if (e.key.toLowerCase() === 'g' && !e.shiftKey) return useUiStore.getState().openComposer() // G: mục tiêu mới (Shift+G là lớp debug đường đi)
      if (e.key === '?') return useUiStore.getState().setShortcuts(true) // ?: bảng phím tắt
      if (e.key.toLowerCase() === 'a') { const ui = useUiStore.getState(); return ui.inbox.open ? ui.closeInbox() : ui.openInbox() } // A: hộp thư duyệt
      if (!/^[0-9]$/.test(e.key)) return
      if (e.key === '0') return navigate('/company')
      const target = Object.values(useDepartmentStore.getState().departmentsById).sort((a, b) => a.order - b.order)[Number(e.key) - 1]
      if (target) navigate(`/department/${target.slug}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, navigate])

  const onOffice = pathname !== '/agents'
  return (
    <div className="flex h-full flex-col">
      <a href="#main" className="sr-only z-[70] rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-2 focus:top-2">Bỏ qua tới nội dung chính</a>
      <TopBar />
      <SystemBar />
      {connection !== 'connected' && (
        <div role="status" className="bg-yellow-400 px-4 py-1 text-center text-sm font-medium text-yellow-950">Đang kết nối lại…</div>
      )}
      {q.isError && <ErrorBanner message="Không tải được danh sách agent." onRetry={() => void q.refetch()} />}
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-auto outline-none"><Suspense fallback={<div className="h-full animate-pulse bg-slate-100" aria-busy="true" aria-label="Đang tải trang" />}><Outlet /></Suspense></main>
        {onOffice && notifOpen && <NotificationPanel onClose={() => useUiStore.getState().closeNotifs()} />}
        {onOffice && !notifOpen && inboxOpen && <ApprovalInbox onClose={() => useUiStore.getState().closeInbox()} />}
        {onOffice && !notifOpen && !inboxOpen && deviceId && <DevicePanel key={deviceId} id={deviceId} onClose={() => useDeviceStore.getState().select(null)} />}
        {onOffice && !notifOpen && !inboxOpen && !deviceId && selectedId && <AgentPanel key={selectedId} onClose={close} />}
        {onOffice && !notifOpen && !inboxOpen && !deviceId && !selectedId && deptPanelOpen && dept && <DepartmentPanel key={dept.id} department={dept} onClose={() => useUiStore.getState().setDeptPanel(false)} />}
      </div>
      <AgentFormModal />
      <DepartmentFormModal />
      <ShortcutsDialog />
      {composerOpen && <GoalComposer />}
      <button onClick={() => useUiStore.getState().openComposer()} aria-label="Mục tiêu mới (phím G)"
        className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-xl hover:bg-brand-dark">
        <Target size={18} aria-hidden="true" /> Mục tiêu mới <kbd className="hidden rounded bg-white px-1.5 text-xs font-bold text-brand-dark sm:inline">G</kbd>
      </button>
      <CommandPalette />
      <ToastHost />
    </div>
  )
}
