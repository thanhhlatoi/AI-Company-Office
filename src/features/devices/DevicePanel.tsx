import { TriangleAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PANEL_CLASS } from '../../components/panelStyles'
import { timeAgo, formatDateTime } from '../../lib/time'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useDeviceStore, type Sample } from '../../store/deviceStore'
import type { Device } from '../../types'
import { DEVICE_STATUS, fmtKbps, fmtUptime, pct } from './format'
import { useDeviceHistory } from './hooks'
import { Sparkline } from './Sparkline'

const SESSION_START = new Date().toISOString() // lịch sử từ BE chỉ lấy phần trước lúc mở trang; sự kiện sau đó FE tự ghi
const TYPE_NAME = { WORKSTATION: 'Máy làm việc', AI_PC: 'Máy AI local', LAPTOP: 'Laptop', SERVER: 'Server', ROUTER: 'Router', NAS: 'NAS' } as const
const NONE: Sample[] = []

const Bar = ({ label, value }: { label: string; value?: number | null }) =>
  value == null ? null : (
    <div className="text-sm">
      <div className="flex justify-between"><span className="text-slate-600">{label}</span><span className="tabular-nums">{pct(value)}</span></div>
      <div className="mt-1 h-2 rounded bg-slate-200"><div className="h-2 rounded" style={{ width: `${Math.min(100, value)}%`, background: value >= 90 ? '#dc2626' : value >= 70 ? '#ca8a04' : '#16a34a' }} /></div>
    </div>
  )

export function DevicePanel({ id, onClose }: { id: string; onClose: () => void }) {
  const device = useDeviceStore((s) => s.devicesById[id])
  const history = useDeviceStore((s) => s.history[id]) ?? NONE
  const alerts = useDeviceStore((s) => s.alerts)
  const local = useDeviceStore((s) => s.eventsByDevice[id])
  const past = useDeviceHistory(id)
  const agents = useAgentStore((s) => s.agentsById)
  const departments = useDepartmentStore((s) => s.departmentsById)
  const navigate = useNavigate()
  const [showIp, setShowIp] = useState(false)

  const mine = useMemo(() => Object.values(alerts).filter((a) => a.deviceId === id), [alerts, id])
  const onThis = useMemo(() => Object.values(agents).filter((a) => a.runsOnDeviceId === id), [agents, id])
  const events = useMemo(() => [...(past.data ?? []).filter((e) => e.createdAt < SESSION_START), ...(local ?? [])].reverse(), [past.data, local])
  if (!device) return null
  const st = DEVICE_STATUS[device.status]
  const m = device.metrics

  const goAgent = (a: (typeof onThis)[number]) => {
    const dept = a.departmentId ? departments[a.departmentId] : undefined
    if (dept) navigate(`/department/${dept.slug}/agent/${a.id}`)
  }

  return (
    <aside aria-label={`Chi tiết thiết bị ${device.name}`} className={PANEL_CLASS}>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-lg font-semibold">{device.name}</div>
          <div className="text-sm text-slate-600">{TYPE_NAME[device.type]}{device.os && ` · ${device.os}`}</div>
        </div>
        <button aria-label="Đóng panel" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={18} /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {mine.map((a) => (
          <div key={a.key} role="alert" className={`flex items-center gap-2 rounded-card border px-3 py-2 text-sm ${a.severity === 'critical' ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
            <TriangleAlert size={16} aria-hidden="true" /> {a.message}
          </div>
        ))}
        <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
          <dt className="text-slate-600">Trạng thái</dt>
          <dd><span className="inline-block rounded-full px-3 py-0.5 font-medium" style={{ background: st.soft, color: st.color }}>{st.label}</span></dd>
          <dt className="text-slate-600">Uptime</dt><dd>{device.status === 'OFFLINE' ? '—' : fmtUptime(device.uptimeSec)}</dd>
          <dt className="text-slate-600">Thấy lần cuối</dt><dd title={device.lastSeen ? formatDateTime(device.lastSeen) : undefined}>{device.lastSeen ? timeAgo(device.lastSeen) : '—'}</dd>
          {device.ip && <>
            <dt className="text-slate-600">Địa chỉ IP</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono">{showIp ? device.ip : '••••••••••'}</span>
              <button onClick={() => setShowIp(!showIp)} aria-pressed={showIp} className="text-xs text-brand underline">{showIp ? 'Ẩn' : 'Hiện'}</button>
            </dd>
          </>}
        </dl>

        {history.length > 1 && (
          <section aria-label="Biểu đồ" className="grid grid-cols-2 gap-3">
            <Chart title="CPU" now={pct(m.cpuPct)} values={history.map((h) => h.cpu)} max={100} color="#2563eb" />
            <Chart title="RAM" now={pct(m.ramPct)} values={history.map((h) => h.ram)} max={100} color="#7c3aed" />
            <Chart title="Nhiệt độ" now={m.tempC == null ? '—' : `${Math.round(m.tempC)}°C`} values={history.map((h) => h.temp)} max={100} color="#ea580c" />
            <Chart title="Mạng" now={m.netInKbps == null && m.netOutKbps == null ? '—' : fmtKbps((m.netInKbps ?? 0) + (m.netOutKbps ?? 0))} values={history.map((h) => h.net)} color="#0e7490" />
          </section>
        )}
        <TypeSection device={device} />

        <section>
          <h3 className="mb-2 text-sm font-semibold">Agent đang chạy trên máy này</h3>
          {onThis.length === 0 ? <p className="text-sm text-slate-600">Không có agent nào.</p> : (
            <ul className="space-y-1">
              {onThis.map((a) => (
                <li key={a.id}><button onClick={() => goAgent(a)} className="w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-slate-100">{a.name} <span className="text-slate-600">· {a.role}</span></button></li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Nhật ký thiết bị</h3>
          {events.length === 0 ? <p className="text-sm text-slate-600">Chưa có sự kiện.</p> : (
            <ul className="space-y-1 font-mono text-xs">
              {events.map((e) => (
                <li key={e.id} className={e.severity === 'critical' ? 'text-red-700' : e.severity === 'warning' ? 'text-amber-700' : ''}>
                  <span className="text-slate-600">{formatDateTime(e.createdAt)}</span> {e.message}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Hành động" className="border-t border-slate-200 pt-3">
          <div className="flex flex-wrap gap-2">
            {['Wake-on-LAN', 'Khởi động lại', 'Tắt máy'].map((label) => (
              // Chưa làm điều khiển máy từ xa. Khi BE hỗ trợ, nút phải tạo yêu cầu duyệt mức DESTRUCTIVE, không gọi trực tiếp.
              <button key={label} disabled title="BE chưa hỗ trợ" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 disabled:cursor-not-allowed">{label}</button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-600">BE chưa hỗ trợ điều khiển máy từ xa.</p>
        </section>
      </div>
    </aside>
  )
}

function Chart({ title, now, values, max, color }: { title: string; now: string; values: (number | undefined)[]; max?: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="text-slate-600">{title}</span><span className="tabular-nums font-medium">{now}</span></div>
      <Sparkline values={values} max={max} color={color} label={title} />
    </div>
  )
}

/** Mục riêng theo loại: chỉ hiện khi BE có gửi số liệu tương ứng. */
function TypeSection({ device }: { device: Device }) {
  const { gpu, nas, router } = device.metrics
  if (!gpu && !nas && !router) return null
  return (
    <section className="space-y-3">
      {gpu && <><Bar label="GPU" value={gpu.utilPct} /><Bar label="VRAM" value={gpu.vramPct} />{gpu.tempC != null && <div className="text-sm text-slate-600">Nhiệt độ GPU: {Math.round(gpu.tempC)}°C</div>}</>}
      {nas && <><Bar label="Dung lượng đã dùng" value={nas.volumeUsedPct} />{nas.raidStatus && <div className="text-sm"><span className="text-slate-600">RAID:</span> {nas.raidStatus}</div>}</>}
      {router && (
        <div className="grid grid-cols-[110px_1fr] gap-y-1 text-sm">
          {router.wanUp != null && <><span className="text-slate-600">WAN</span><span className={router.wanUp ? 'text-green-700' : 'text-red-700'}>{router.wanUp ? 'Đang nối' : 'Mất kết nối'}</span></>}
          {router.latencyMs != null && <><span className="text-slate-600">Độ trễ</span><span>{Math.round(router.latencyMs)} ms</span></>}
        </div>
      )}
    </section>
  )
}

