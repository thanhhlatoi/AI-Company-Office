import type { DeviceStatus } from '../../types'

export const DEVICE_STATUS: Record<DeviceStatus, { label: string; color: string; soft: string }> = {
  ONLINE: { label: 'Trực tuyến', color: '#16a34a', soft: '#dcfce7' },
  DEGRADED: { label: 'Hoạt động kém', color: '#ca8a04', soft: '#fef9c3' },
  OFFLINE: { label: 'Mất kết nối', color: '#dc2626', soft: '#fee2e2' },
}

export function fmtUptime(sec?: number | null): string {
  if (sec == null) return '—'
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60)
  return d ? `${d} ngày ${h} giờ` : h ? `${h} giờ ${m} phút` : `${m} phút`
}

export const fmtKbps = (k: number) => (k >= 1000 ? `${(k / 1000).toFixed(1)} Mbps` : `${Math.round(k)} kbps`)
export const pct = (v?: number | null) => (v == null ? '—' : `${Math.round(v)}%`)
