import { create } from 'zustand'
import { HISTORY_POINTS } from '../config/devices'
import type { AlertKind, Device, DeviceEvent, DeviceMetrics, DeviceStatus, NetworkLink } from '../types'
import { useUiStore } from './uiStore'

export interface DeviceAlert { key: string; deviceId: string; kind: AlertKind; message: string; severity: 'warning' | 'critical'; since: number }
/** Một điểm của biểu đồ nhỏ. */
export interface Sample { cpu?: number; ram?: number; temp?: number; net?: number }

const MAX_EVENTS = 100
let nextEvent = 1
export const alertKey = (deviceId: string, kind: AlertKind) => `${deviceId}:${kind}`

interface DeviceState {
  devicesById: Record<string, Device>
  links: NetworkLink[]
  history: Record<string, Sample[]>
  eventsByDevice: Record<string, DeviceEvent[]>
  /** cảnh báo đang bật, theo `deviceId:kind` */
  alerts: Record<string, DeviceAlert>
  /** cảnh báo mới nhất vừa BẬT (không phải tắt); `at` làm hai lần giống nhau vẫn khác nhau */
  lastAlert: { deviceId: string; at: number } | null
  selectedId: string | null
  setDevices: (list: Device[]) => void
  setLinks: (list: NetworkLink[]) => void
  applyStatus: (id: string, status: DeviceStatus, lastSeen?: string | null) => void
  applyMetrics: (id: string, metrics: DeviceMetrics, uptimeSec?: number | null, lastSeen?: string | null) => void
  applyLink: (l: NetworkLink) => void
  addEvent: (deviceId: string, type: string, message: string, severity?: DeviceEvent['severity']) => void
  raiseAlert: (a: Omit<DeviceAlert, 'key' | 'since'>) => void
  clearAlert: (deviceId: string, kind: AlertKind) => void
  select: (id: string | null) => void
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devicesById: {},
  links: [],
  history: {},
  eventsByDevice: {},
  alerts: {},
  lastAlert: null,
  selectedId: null,
  setDevices: (list) => set((s) => ({
    devicesById: Object.fromEntries(list.map((d) => [d.id, d])),
    selectedId: s.selectedId && list.some((d) => d.id === s.selectedId) ? s.selectedId : null,
  })),
  setLinks: (links) => set({ links }),
  applyStatus: (id, status, lastSeen) => {
    const d = get().devicesById[id]
    if (!d || d.status === status) return // thiết bị chưa có trong store: lần tải sau sẽ có
    set((s) => ({ devicesById: { ...s.devicesById, [id]: { ...d, status, lastSeen: lastSeen ?? d.lastSeen } } }))
    const text = { ONLINE: d.status === 'OFFLINE' ? 'Đã kết nối lại' : 'Hoạt động bình thường', DEGRADED: 'Hoạt động kém', OFFLINE: 'Mất kết nối' }[status]
    get().addEvent(id, 'status', text, status === 'OFFLINE' ? 'critical' : status === 'DEGRADED' ? 'warning' : 'info')
  },
  applyMetrics: (id, metrics, uptimeSec, lastSeen) => {
    const d = get().devicesById[id]
    if (!d) return
    const sample: Sample = {
      cpu: metrics.cpuPct ?? undefined, ram: metrics.ramPct ?? undefined, temp: metrics.tempC ?? undefined,
      net: metrics.netInKbps == null && metrics.netOutKbps == null ? undefined : (metrics.netInKbps ?? 0) + (metrics.netOutKbps ?? 0),
    }
    set((s) => ({
      devicesById: { ...s.devicesById, [id]: { ...d, metrics, uptimeSec: uptimeSec ?? d.uptimeSec, lastSeen: lastSeen ?? new Date().toISOString() } },
      history: { ...s.history, [id]: [...(s.history[id] ?? []), sample].slice(-HISTORY_POINTS) },
    }))
  },
  applyLink: (l) => set((s) => {
    const i = s.links.findIndex((x) => x.fromDeviceId === l.fromDeviceId && x.toDeviceId === l.toDeviceId)
    return { links: i < 0 ? [...s.links, l] : s.links.map((x, j) => (j === i ? l : x)) }
  }),
  addEvent: (deviceId, type, message, severity = 'info') => set((s) => ({
    eventsByDevice: {
      ...s.eventsByDevice,
      [deviceId]: [...(s.eventsByDevice[deviceId] ?? []), { id: `local-${nextEvent++}`, deviceId, type, message, severity, createdAt: new Date().toISOString() }].slice(-MAX_EVENTS),
    },
  })),
  // Đã bật rồi thì bỏ qua: toast/nhật ký chỉ một lần, không lặp mỗi lần cập nhật số liệu
  raiseAlert: (a) => {
    const key = alertKey(a.deviceId, a.kind)
    if (get().alerts[key]) return
    set((s) => ({ alerts: { ...s.alerts, [key]: { ...a, key, since: Date.now() } }, lastAlert: { deviceId: a.deviceId, at: Date.now() } }))
    get().addEvent(a.deviceId, 'alert', a.message, a.severity)
    useUiStore.getState().toast(`${get().devicesById[a.deviceId]?.name ?? a.deviceId}: ${a.message}`, 'error')
  },
  clearAlert: (deviceId, kind) => {
    const key = alertKey(deviceId, kind)
    if (!get().alerts[key]) return
    set((s) => { const { [key]: _gone, ...rest } = s.alerts; return { alerts: rest } })
    get().addEvent(deviceId, 'alert_cleared', 'Hết cảnh báo')
  },
  select: (selectedId) => set({ selectedId }),
}))
