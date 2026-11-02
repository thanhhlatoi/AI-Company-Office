import { Crosshair } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useDeviceStore } from '../../store/deviceStore'
import { useWorkStore } from '../../store/workStore'
import { useUiStore } from '../../store/uiStore'
import { useAgentsQuery } from '../agents/hooks'
import { OfficeScene, type SceneHandlers } from './OfficeScene'
import { useRouteView } from './useRouteView'

export function OfficeCanvas() {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<OfficeScene | null>(null)
  const { isLoading } = useAgentsQuery()
  const count = useAgentStore((s) => Object.keys(s.agentsById).length)
  const openForm = useUiStore((s) => s.openForm)
  const navigate = useNavigate()
  const view = useRouteView()

  // Scene sống lâu hơn một lần render nên gọi handler qua ref để luôn thấy URL mới nhất
  const handlers = useRef<SceneHandlers>({ onAgentTap: () => {}, onDepartmentTap: () => {}, onDepartmentSignTap: () => {}, onAddAgent: () => {}, onDeviceTap: () => {} })
  useEffect(() => {
    handlers.current = {
      onAgentTap: (id) => {
        // nhân vật đang chờ duyệt: mở thẳng yêu cầu của họ
        const waiting = Object.values(useWorkStore.getState().approvalsById).find((a) => a.agentId === id && a.status === 'PENDING')
        if (waiting) return useUiStore.getState().openInbox(waiting.id)
        const dept = useDepartmentStore.getState().departmentsById[useAgentStore.getState().agentsById[id]?.departmentId ?? '']
        if (dept) navigate(`/department/${dept.slug}/agent/${id}`)
        else useAgentStore.getState().select(id) // agent chưa thuộc phòng nào
      },
      onDepartmentTap: (id) => {
        const dept = useDepartmentStore.getState().departmentsById[id]
        if (dept && dept.slug !== view.slug) navigate(`/department/${dept.slug}`)
      },
      // Bấm biển tên phòng: bay vào phòng và mở panel phòng ban
      onDepartmentSignTap: (id) => {
        const dept = useDepartmentStore.getState().departmentsById[id]
        if (!dept) return
        if (dept.slug !== view.slug || view.agentId) navigate(`/department/${dept.slug}`)
        useUiStore.getState().setDeptPanel(true)
      },
      onAddAgent: (id) => useUiStore.getState().openForm(undefined, id),
      onDeviceTap: (id) => useDeviceStore.getState().select(id),
    }
  })

  useEffect(() => {
    // app.init của Pixi là async: nếu effect đã bị dọn (StrictMode) thì huỷ ngay khi tạo xong
    let cancelled = false
    OfficeScene.create(host.current!, {
      onAgentTap: (id) => handlers.current.onAgentTap(id),
      onDepartmentTap: (id) => handlers.current.onDepartmentTap(id),
      onDepartmentSignTap: (id) => handlers.current.onDepartmentSignTap(id),
      onAddAgent: (id) => handlers.current.onAddAgent(id),
      onDeviceTap: (id) => handlers.current.onDeviceTap(id),
    }).then((s) => {
      if (cancelled) s.destroy()
      else scene.current = s
    })
    return () => { cancelled = true; scene.current?.destroy(); scene.current = null }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={host} className="absolute inset-0" />
      {isLoading && (
        <div className="absolute inset-0 grid grid-cols-3 gap-6 bg-slate-100 p-10" aria-label="Đang tải">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="animate-pulse rounded-card bg-slate-200" />)}
        </div>
      )}
      {!isLoading && count === 0 && (
        <div className="absolute inset-0 grid place-items-center bg-slate-100/90 text-center">
          <div>
            <p className="text-slate-600">Văn phòng đang trống.</p>
            <button onClick={() => openForm()} className="mt-3 rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark">Tạo agent đầu tiên</button>
          </div>
        </div>
      )}
      <button
        aria-label="Về giữa"
        onClick={() => scene.current?.resetCamera()}
        className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm shadow-card hover:bg-slate-50"
      >
        <Crosshair size={16} /> Về giữa
      </button>
    </div>
  )
}
