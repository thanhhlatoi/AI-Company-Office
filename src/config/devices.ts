import type { DeviceType } from '../types'

// NGUỒN SEED thiết bị cho mock. Thêm/bớt thiết bị: chỉ sửa danh sách này.
// Khi BE có /devices, dữ liệu thiết bị đến từ BE; file này chỉ còn cung cấp ngưỡng cảnh báo.

export interface DeviceSeed {
  id: string
  name: string
  type: DeviceType
  os: string
  ip: string
  /** tên agent phụ trách (nhân viên phòng Hạ tầng) */
  owner: string
}

export const DEVICES: DeviceSeed[] = [
  { id: 'workstation', name: 'Máy làm việc', type: 'WORKSTATION', os: 'Windows 11', ip: '192.168.88.10', owner: 'Giám sát hệ thống' },
  { id: 'ai-pc', name: 'Máy AI local', type: 'AI_PC', os: 'Ubuntu 24.04 + CUDA', ip: '192.168.88.11', owner: 'Quản lý AI local' },
  { id: 'laptop', name: 'Laptop Ubuntu', type: 'LAPTOP', os: 'Ubuntu 24.04', ip: '192.168.88.12', owner: 'Giám sát hệ thống' },
  { id: 'server', name: 'Server', type: 'SERVER', os: 'Debian 12', ip: '192.168.88.20', owner: 'Giám sát hệ thống' },
  { id: 'router', name: 'Router MikroTik hEX', type: 'ROUTER', os: 'RouterOS 7', ip: '192.168.88.1', owner: 'Quản trị mạng' },
  { id: 'nas', name: 'NAS Synology', type: 'NAS', os: 'DSM 7.2', ip: '192.168.88.30', owner: 'Sao lưu & NAS' },
]

/** Nút ảo cho đầu "Internet" của sơ đồ mạng. */
export const INTERNET_ID = 'internet'

/** Ngưỡng cảnh báo (xem features/devices/alerts.ts). */
export const ALERT_THRESHOLDS = {
  cpuPct: 90,
  cpuSustainSec: 300, // CPU phải cao liên tục từng này giây mới cảnh báo
  diskPct: 85,
  tempC: 80,
  heartbeatSec: 60, // quá từng này giây không có tin = OFFLINE
  clearDelaySec: 30, // hết vi phạm phải ổn định từng này giây mới tắt cảnh báo (chống chớp tắt)
} as const

/** Số điểm giữ lại cho biểu đồ nhỏ. */
export const HISTORY_POINTS = 60
