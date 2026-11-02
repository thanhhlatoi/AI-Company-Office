import { ALERT_THRESHOLDS as T } from '../../config/devices'
import { alertKey, useDeviceStore } from '../../store/deviceStore'
import type { AlertKind, Device } from '../../types'

interface Rule { kind: AlertKind; sustainMs: number; check: (d: Device) => string | null }
const max = (...v: (number | null | undefined)[]) => Math.max(-1, ...v.filter((x): x is number => x != null))

// Mỗi luật trả về thông điệp khi đang vi phạm, null khi ổn.
const RULES: Rule[] = [
  { kind: 'cpu', sustainMs: T.cpuSustainSec * 1000, check: (d) => ((d.metrics.cpuPct ?? 0) > T.cpuPct ? `CPU ${Math.round(d.metrics.cpuPct as number)}% kéo dài` : null) },
  { kind: 'disk', sustainMs: 0, check: (d) => { const v = max(d.metrics.diskPct, d.metrics.nas?.volumeUsedPct); return v > T.diskPct ? `Đĩa gần đầy (${Math.round(v)}%)` : null } },
  { kind: 'temp', sustainMs: 0, check: (d) => { const v = max(d.metrics.tempC, d.metrics.gpu?.tempC); return v > T.tempC ? `Nhiệt độ cao (${Math.round(v)}°C)` : null } },
  { kind: 'offline', sustainMs: 0, check: (d) => (d.status === 'OFFLINE' ? 'Mất kết nối' : null) },
]

// Thời điểm bắt đầu vi phạm / bắt đầu ổn trở lại, theo `deviceId:kind` (để tính "quá 5 phút" và độ trễ khi tắt)
const badSince = new Map<string, number>()
const okSince = new Map<string, number>()

/** Bật/tắt cảnh báo của một thiết bị theo ngưỡng trong config. Gọi sau mỗi lần số liệu hoặc trạng thái đổi. */
export function evaluateDevice(deviceId: string, now = Date.now()) {
  const st = useDeviceStore.getState()
  const d = st.devicesById[deviceId]
  if (!d) return
  for (const r of RULES) {
    const key = alertKey(deviceId, r.kind)
    const msg = r.check(d)
    if (msg) {
      okSince.delete(key)
      const since = badSince.get(key) ?? now
      badSince.set(key, since)
      if (now - since >= r.sustainMs) st.raiseAlert({ deviceId, kind: r.kind, message: msg, severity: r.kind === 'offline' ? 'critical' : 'warning' })
    } else {
      badSince.delete(key)
      if (!st.alerts[key]) continue
      const since = okSince.get(key) ?? now
      okSince.set(key, since)
      if (now - since >= T.clearDelaySec * 1000) { okSince.delete(key); st.clearAlert(deviceId, r.kind) }
    }
  }
}

/** Mất heartbeat quá ngưỡng = OFFLINE. Gọi định kỳ. */
export function checkHeartbeats(now = Date.now()) {
  const st = useDeviceStore.getState()
  for (const d of Object.values(st.devicesById)) {
    if (d.status === 'OFFLINE' || !d.lastSeen) continue
    if (now - Date.parse(d.lastSeen) > T.heartbeatSec * 1000) {
      st.applyStatus(d.id, 'OFFLINE')
      evaluateDevice(d.id, now)
    }
  }
}
