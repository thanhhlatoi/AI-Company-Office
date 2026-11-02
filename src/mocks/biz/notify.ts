import type { Delivery, NotificationSettings } from '../../types/notify'
import { newId } from '../db'
import { paginate } from './lists'
import { HOUR } from './rng'
import { NOW } from './seed'
import { notifications } from './seedText'

// Mock ghép kênh thông báo + quy tắc + lịch sử giao hàng (Prompt 3C, Bước 2).
const iso = () => new Date().toISOString()
const rule = (type: string, app: boolean, telegram: boolean, email: boolean, minLevel: NotificationSettings['rules'][number]['minLevel'] = 'INFO') => ({ type, channels: { app, telegram, email }, minLevel })
let settings: NotificationSettings = {
  telegram: { status: 'NONE' }, email: { status: 'NONE' },
  rules: [rule('goal.done', true, true, false), rule('task.failed', true, true, true, 'WARNING'), rule('task.done', true, false, false), rule('approval.requested', true, true, false), rule('budget.soft', true, false, false, 'WARNING'), rule('budget.hard', true, true, true, 'CRITICAL'), rule('device.offline', true, true, false, 'CRITICAL')],
  quiet: { enabled: false, from: '22:00', to: '07:00', tz: 'Asia/Ho_Chi_Minh' }, digest: { enabled: false, at: '18:00' },
}
const deliveries: Delivery[] = Array.from({ length: 14 }, (_, i) => ({
  id: String(900 + i), channel: i % 3 === 0 ? 'EMAIL' : 'TELEGRAM', title: `Task lỗi: Dịch phụ đề #${i + 1}`, status: i === 2 || i === 6 || i === 10 ? 'FAILED' : i === 4 || i === 11 ? 'DEAD' : 'SENT',
  error: i === 2 || i === 6 || i === 10 ? 'Telegram 502 Bad Gateway' : i === 4 || i === 11 ? 'SMTP 550: hộp thư không tồn tại (đã thử 5 lần)' : null, attempts: i === 4 || i === 11 ? 5 : 1, createdAt: new Date(NOW - (i + 1) * 3 * HOUR).toISOString(),
}))
let pairing: string | null = null // mã ghép đang chờ
const addDelivery = (channel: Delivery['channel'], title: string, fail = false): Delivery => {
  const d: Delivery = { id: newId(), channel, title, status: fail ? 'FAILED' : 'SENT', error: fail ? 'SMTP 550: địa chỉ bị từ chối' : null, attempts: 1, createdAt: iso() }
  deliveries.unshift(d)
  return d
}
const fail = (msg: string): never => { throw new Error(`Mock 400: ${msg}`) }

/** Các route GHI/cài đặt thông báo. undefined = không phải route của nhóm này. */
export function notifyRequest(method: string, fullPath: string, body: unknown): unknown {
  const [path, qs = ''] = fullPath.split('?')
  const b = (body ?? {}) as Record<string, string | undefined>
  const seg = path.split('/')
  if (seg[1] === 'notifications' && method === 'POST') {
    if (seg[2] === 'read-all') { notifications.forEach((n) => { n.readAt ??= iso() }); return { count: 0 } }
    const n = notifications.find((x) => x.id === seg[2])
    if (n && seg[3] === 'read') { n.readAt ??= iso(); return n }
  }
  if (path === '/notification-settings') {
    if (method === 'PUT') settings = { ...settings, ...(body as Pick<NotificationSettings, 'rules' | 'quiet' | 'digest'>) }
    return settings
  }
  if (seg[1] === 'notification-deliveries') {
    if (!seg[2]) return paginate(deliveries, new URLSearchParams(qs).get('cursor'), 20)
    const d = deliveries.find((x) => x.id === seg[2])
    if (d && seg[3] === 'resend') { Object.assign(d, { status: 'SENT', error: null, attempts: d.attempts + 1 }); return d }
  }
  if (seg[1] !== 'notification-channels') return undefined
  const channel = seg[2]
  if (channel === 'telegram') {
    if (seg[3] === 'link' && method === 'POST') {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      pairing = code
      settings.telegram = { status: 'PENDING', botName: 'AgentOfficeBot' }
      setTimeout(() => { if (pairing === code) { settings.telegram = { status: 'VERIFIED', username: '@chu_cong_ty', botName: 'AgentOfficeBot' }; pairing = null } }, 8000) // giả lập người dùng gửi /start <mã>
      setTimeout(() => { if (pairing === code) { pairing = null; settings.telegram = { status: 'NONE' } } }, 10 * 60_000) // mã hết hạn
      return { code, botName: 'AgentOfficeBot', expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }
    }
    if (seg[3] === 'test') return addDelivery('TELEGRAM', 'Tin thử từ AgentOffice')
    if (method === 'DELETE') { pairing = null; settings.telegram = { status: 'NONE' }; return null }
  }
  if (channel === 'email') {
    if (!seg[3] && method === 'POST') { if (!/^\S+@\S+\.\S+$/.test(b.address ?? '')) fail('email không hợp lệ'); settings.email = { status: 'PENDING', address: b.address }; return settings }
    if (seg[3] === 'verify') { if (b.code !== '123456') fail('mã không đúng'); settings.email = { status: 'VERIFIED', address: settings.email.address }; return settings } // mock: mã luôn là 123456
    if (seg[3] === 'test') return addDelivery('EMAIL', 'Thư thử từ AgentOffice', (settings.email.address ?? '').includes('fail'))
    if (method === 'DELETE') { settings.email = { status: 'NONE' }; return null }
  }
  return undefined
}
