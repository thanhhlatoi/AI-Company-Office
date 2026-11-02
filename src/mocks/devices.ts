import { DEVICES, INTERNET_ID } from '../config/devices'
import { INFRA_SLUG } from '../config/departments'
import type { Device, DeviceEvent, DeviceMetrics, DeviceType, NetworkLink, RealtimeMessage } from '../types'
import { mockDb } from './db'

// Thiết bị giả: dựng từ config/devices.ts. Chỉ số dao động quanh mức nền; vài kịch bản để thử cảnh báo:
//  - Laptop Ubuntu thỉnh thoảng OFFLINE rồi online lại (agent chạy trên đó hiện "Mất máy chủ")
//  - thỉnh thoảng một máy tăng CPU rồi BE báo device.alert
//  - Server mất đường mạng đúng một lần (link đứt -> OFFLINE -> nối lại)
const rand = (min: number, max: number) => min + Math.random() * (max - min)
const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v))
const iso = () => new Date().toISOString()

interface Base { cpu: number; ram: number; disk: number; temp: number; net: number }
const BASE: Record<DeviceType, Base> = {
  WORKSTATION: { cpu: 25, ram: 55, disk: 60, temp: 48, net: 800 },
  AI_PC: { cpu: 45, ram: 70, disk: 55, temp: 62, net: 1500 },
  LAPTOP: { cpu: 20, ram: 50, disk: 65, temp: 45, net: 400 },
  SERVER: { cpu: 35, ram: 60, disk: 50, temp: 52, net: 2500 },
  ROUTER: { cpu: 8, ram: 30, disk: 20, temp: 42, net: 4000 },
  NAS: { cpu: 12, ram: 40, disk: 72, temp: 40, net: 1200 },
}

const infraId = () => mockDb.departments.find((d) => d.slug === INFRA_SLUG)?.id
const ownerOf = (name: string) => mockDb.agents.find((a) => a.departmentId === infraId() && a.name === name)?.id ?? null
const T0 = Date.now()

export const mockDevices: Device[] = DEVICES.map((d) => ({
  id: d.id, name: d.name, type: d.type, os: d.os, ip: d.ip, ownerAgentId: ownerOf(d.owner),
  status: 'ONLINE', lastSeen: iso(), uptimeSec: Math.round(rand(2, 9) * 86400), metrics: {},
}))
export const mockLinks: NetworkLink[] = [
  { fromDeviceId: INTERNET_ID, toDeviceId: 'router', kbps: 0, latencyMs: 12, up: true },
  ...DEVICES.filter((d) => d.type !== 'ROUTER').map((d) => ({ fromDeviceId: 'router', toDeviceId: d.id, kbps: 0, latencyMs: 1, up: true })),
]
/** Lịch sử cũ (trước khi mở trang), cho GET /devices/{id}/events. */
const history: DeviceEvent[] = mockDevices.map((d, i) => ({
  id: `h${i}`, deviceId: d.id, type: 'boot', message: 'Khởi động', severity: 'info', createdAt: new Date(T0 - (d.uptimeSec ?? 0) * 1000).toISOString(),
}))

/** GET /devices, /devices/{id}, /devices/{id}/events, /network/topology. undefined = không phải route thiết bị. */
export function deviceRequest(path: string): unknown {
  if (path === '/devices') return mockDevices
  if (path === '/network/topology') return mockLinks
  const m = path.match(/^\/devices\/([^/]+)(\/events)?$/)
  if (!m) return undefined
  if (m[2]) return history.filter((e) => e.deviceId === m[1])
  const d = mockDevices.find((x) => x.id === m[1])
  if (!d) throw new Error(`Mock 404: không có thiết bị ${m[1]}`)
  return d
}

/** Phát device.* / network.link_changed y hệt BE thật (~5-8s một lượt). Trả về hàm dừng. */
export function startDeviceSimulator(emit: (m: RealtimeMessage) => void): () => void {
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let stopped = false
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => { timers.delete(t); if (!stopped) fn() }, ms)
    timers.add(t)
  }
  const m = new Map<string, DeviceMetrics>() // chỉ số hiện tại
  const spikeUntil = new Map<string, number>()
  const bootAt = new Map<string, number>() // máy đã khởi động lại: uptime tính từ lúc này
  const uptime0 = new Map(mockDevices.map((d) => [d.id, d.uptimeSec ?? 0]))
  const linkOf = (id: string) => mockLinks.find((l) => l.toDeviceId === id)!
  const dev = (id: string) => mockDevices.find((d) => d.id === id)!

  const setStatus = (id: string, status: Device['status']) => {
    const d = dev(id)
    if (d.status === status) return
    d.status = status
    if (status === 'OFFLINE') { linkOf(id).up = false; linkOf(id).kbps = 0 } else linkOf(id).up = true
    emit({ type: 'device.status_changed', deviceId: id, status, lastSeen: iso() })
    emit({ type: 'network.link_changed', ...linkOf(id) })
  }

  const step = (d: Device) => {
    const b = BASE[d.type]
    const spike = (spikeUntil.get(d.id) ?? 0) > Date.now()
    const prev = m.get(d.id)
    const walk = (cur: number | undefined, target: number, spread: number) => clamp((cur ?? target) + (target - (cur ?? target)) * 0.25 + rand(-spread, spread))
    const cpu = walk(prev?.cpuPct ?? undefined, spike ? 96 : b.cpu, 5)
    const gpuHeavy = d.type === 'AI_PC'
    const next: DeviceMetrics = {
      cpuPct: cpu,
      ramPct: walk(prev?.ramPct ?? undefined, b.ram, 2),
      diskPct: walk(prev?.diskPct ?? undefined, b.disk, 0.2),
      tempC: walk(prev?.tempC ?? undefined, b.temp + (spike ? 22 : 0), 2),
      netInKbps: Math.round(b.net * rand(0.4, 1.6)),
      netOutKbps: Math.round(b.net * 0.4 * rand(0.4, 1.6)),
    }
    if (gpuHeavy) next.gpu = { utilPct: walk(prev?.gpu?.utilPct ?? undefined, 85, 8), vramPct: walk(prev?.gpu?.vramPct ?? undefined, 78, 3), tempC: walk(prev?.gpu?.tempC ?? undefined, 74, 2) }
    if (d.type === 'NAS') next.nas = { volumeUsedPct: next.diskPct, raidStatus: 'Healthy' }
    if (d.type === 'ROUTER') next.router = { wanUp: linkOf('router').up, latencyMs: Math.round(rand(9, 18)) }
    m.set(d.id, next)
    return next
  }

  const tick = () => {
    for (const d of mockDevices) {
      if (d.status === 'OFFLINE') continue // máy mất kết nối: không có tin nào
      const met = step(d)
      const hot = (met.cpuPct ?? 0) > 90 || (met.tempC ?? 0) > 80
      setStatus(d.id, hot ? 'DEGRADED' : 'ONLINE')
      d.uptimeSec = Math.round((Date.now() - (bootAt.get(d.id) ?? T0)) / 1000) + (bootAt.has(d.id) ? 0 : uptime0.get(d.id) ?? 0)
      d.lastSeen = iso()
      emit({ type: 'device.metrics', deviceId: d.id, metrics: met, uptimeSec: d.uptimeSec, lastSeen: d.lastSeen })
      if (d.type !== 'ROUTER') {
        const l = linkOf(d.id)
        l.kbps = (met.netInKbps ?? 0) + (met.netOutKbps ?? 0)
        emit({ type: 'network.link_changed', ...l })
      }
    }
    const inet = mockLinks[0]
    inet.kbps = mockLinks.slice(1).reduce((s, l) => s + l.kbps, 0)
    emit({ type: 'network.link_changed', ...inet })
    later(tick, rand(5000, 8000))
  }

  // Laptop Ubuntu: OFFLINE 25-40s, lần đầu sau ~20s, các lần sau cách 90-150s
  const laptopDown = () => {
    setStatus('laptop', 'OFFLINE')
    later(() => { bootAt.set('laptop', Date.now()); setStatus('laptop', 'ONLINE'); later(laptopDown, rand(90000, 150000)) }, rand(25000, 40000))
  }
  // Một máy bất kỳ tăng CPU 40s, ~10s sau BE báo device.alert
  const cpuSpike = () => {
    const pool = mockDevices.filter((d) => d.status === 'ONLINE' && d.type !== 'ROUTER')
    const d = pool[Math.floor(Math.random() * pool.length)]
    if (d) {
      spikeUntil.set(d.id, Date.now() + 40000)
      later(() => emit({ type: 'device.alert', deviceId: d.id, kind: 'cpu', message: `CPU ${Math.round(m.get(d.id)?.cpuPct ?? 96)}% kéo dài`, severity: 'warning' }), 10000)
    }
    later(cpuSpike, rand(50000, 80000))
  }
  // Đường mạng tới Server đứt đúng một lần
  const cutServerLink = () => {
    setStatus('server', 'OFFLINE') // đồng thời đánh dấu link down
    later(() => { bootAt.set('server', Date.now()); setStatus('server', 'ONLINE') }, 20000)
  }

  later(tick, 300)
  later(laptopDown, 20000)
  later(cpuSpike, 30000)
  later(cutServerLink, 60000)
  return () => { stopped = true; timers.forEach(clearTimeout); timers.clear() }
}
