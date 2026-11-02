import { mockDb } from '../db'
import type { Conversation, Message } from '../../types/history'
import type { Notification } from '../../types/notify'
import { HOUR, MIN } from './rng'
import { NOW, R, bizTasks, costOf, modelOf, projects } from './seed'

const iso = (ms: number) => new Date(ms).toISOString()
export const conversations: Conversation[] = []
export const messagesOf = new Map<string, Message[]>()

const TITLES = ['Đối soát kế toán tháng 10', 'Soạn kịch bản video #12', 'Kiểm duyệt nội dung tuần này', 'Báo cáo thuế quý 3', 'Dịch phụ đề tiếng Tây Ban Nha', 'Tối ưu tiêu đề và thumbnail', 'Phân tích xu hướng TikTok', 'Lên lịch đăng bài tuần sau', 'Kiểm thử giao diện trang chủ', 'Soạn email báo giá khách hàng']
const TOOLS: [string, () => Record<string, unknown>][] = [
  ['search_web', () => ({ query: R.pick(['xu hướng video ngắn', 'giá quảng cáo', 'thuế GTGT']) })],
  ['read_file', () => ({ path: `/data/${R.pick(['bao-cao', 'so-lieu', 'kich-ban'])}.md` })],
  ['send_email', () => ({ to: 'khach.hang@example.com', subject: 'Báo giá' })],
]

function convo(i: number, extra: { title?: string; messages?: number; error?: boolean; special?: (m: Message[]) => void } = {}) {
  const agent = R.pick(mockDb.agents.filter((a) => a.departmentId))
  const id = `c${i + 1}`
  const started = NOW - R.int(1, 29 * 24) * HOUR
  const n = extra.messages ?? R.int(4, 12)
  const msgs: Message[] = []
  const model = modelOf(agent)
  for (let k = 0; k < n; k++) {
    const role = k === 0 ? 'USER' : k % 3 === 2 ? 'TOOL' : 'ASSISTANT'
    const tokens = R.int(80, 1800)
    const tool = role === 'TOOL' ? R.pick(TOOLS) : null
    msgs.push({
      id: `${id}-m${k + 1}`, role, createdAt: iso(started + k * 40_000), tokens, costMicro: role === 'ASSISTANT' ? (costOf(model, 0, tokens) ?? 0) : 0, truncated: false,
      toolName: tool?.[0], toolArgs: tool?.[1](),
      content: role === 'USER' ? 'Hãy xử lý việc này giúp mình và báo lại kết quả.' : role === 'TOOL' ? 'Kết quả công cụ: 3 mục phù hợp.' : `Đã xử lý bước ${k}:\n\n- Mục **một**\n- Mục hai\n\nTiếp theo mình sẽ kiểm tra kỹ hơn.`,
    })
  }
  if (extra.error) msgs.push({ id: `${id}-err`, role: 'TOOL', createdAt: iso(started + n * 40_000), tokens: 0, costMicro: 0, truncated: false, toolName: 'send_email', toolArgs: { to: 'x@example.com' }, content: 'Lỗi: hết thời gian chờ máy chủ thư.' })
  extra.special?.(msgs)
  const task = R.pick(bizTasks.filter((t) => t.agentId === agent.id))
  messagesOf.set(id, msgs)
  conversations.push({
    id, title: extra.title ?? TITLES[i % TITLES.length], agentId: agent.id, goalId: null, taskId: task?.id ?? null, projectId: projects.find((p) => p.departmentId === agent.departmentId)?.id ?? null,
    startedAt: iso(started), updatedAt: iso(started + msgs.length * 40_000), messageCount: msgs.length, tokens: msgs.reduce((s, m) => s + m.tokens, 0),
    costMicro: msgs.reduce((s, m) => s + m.costMicro, 0), hasError: !!extra.error, tools: [...new Set(msgs.flatMap((m) => (m.toolName ? [m.toolName] : [])))],
  })
}

for (let i = 0; i < 36; i++) convo(i)
// Chuỗi giống khoá API: BE đã thay bằng [REDACTED:API_KEY] (cả trong nội dung lẫn tham số công cụ)
convo(36, { title: 'Gọi dịch vụ ngoài bằng khoá API', special: (m) => {
  m[1].content = 'Mình đã dùng khoá [REDACTED:API_KEY] để gọi dịch vụ.'
  m[2] = { ...m[2], toolName: 'http_request', toolArgs: { url: 'https://api.example.com/v1', authorization: '[REDACTED:API_KEY]' } }
} })
// Nội dung không tin cậy: HTML/script/ảnh/liên kết nguy hiểm chỉ được hiện dạng chữ
convo(37, { title: 'Thử nội dung có thẻ HTML', special: (m) => {
  m[1].content = "<script>alert('xss')</script> <img src=x onerror=alert(1)>\n\n[bấm vào](javascript:alert(1)) **in đậm** [trang ngoài](https://example.com/x) ![ảnh theo dõi](https://evil.example/pixel.png) và <b>thẻ b</b> giữa dòng\n\n```html\n<b>khối code</b>\n```"
} })
convo(38, { title: 'Báo cáo có tin bị cắt bớt', special: (m) => { m[1].truncated = true; m[1].content = `${'Nội dung rất dài. '.repeat(40)}` } })
convo(39, { title: 'Gửi mail lỗi', error: true })
convo(40, { title: 'Hội thoại rất dài (150 tin)', messages: 150 })

// ---- Thông báo ----
const T = (id: number, level: Notification['level'], type: string, title: string, body: string, ago: number, target: Notification['target'], read: boolean): Notification =>
  ({ id: String(id), level, type, title, body, createdAt: iso(NOW - ago), readAt: read ? iso(NOW - ago + MIN) : null, target })
export const notifications: Notification[] = [
  T(1, 'CRITICAL', 'device.offline', 'Laptop Ubuntu mất kết nối', 'Không nhận heartbeat 60 giây.', 20 * MIN, { kind: 'DEVICE', id: 'laptop' }, false),
  T(2, 'WARNING', 'budget.hard', 'Thủ quỹ hết ngân sách ngày', '2 việc đang chờ ngân sách.', 35 * MIN, { kind: 'BUDGET', id: 'b2' }, false),
  T(3, 'WARNING', 'budget.soft', 'Ngân sách công ty đạt 85%', 'Đã dùng 85% hạn mức tháng.', 2 * HOUR, { kind: 'BUDGET', id: 'b1' }, false),
  T(4, 'WARNING', 'task.failed', 'Task lỗi hẳn: Dịch phụ đề #14', 'Đã thử 3 lần.', 3 * HOUR, { kind: 'TASK', id: bizTasks.find((t) => t.status === 'FAILED')?.id ?? '5000' }, false),
  T(5, 'SUCCESS', 'goal.done', 'Mục tiêu hoàn tất: Ra 3 video tuần này', '', 5 * HOUR, { kind: 'GOAL', id: '1' }, true),
  T(6, 'INFO', 'task.done', 'Task xong: Lập báo cáo tuần', '', 6 * HOUR, { kind: 'TASK', id: '5001' }, true),
]
for (let i = 7; i <= 28; i++) {
  const [level, type, title] = R.pick<[Notification['level'], string, string]>([
    ['INFO', 'task.done', 'Task xong'], ['SUCCESS', 'goal.done', 'Mục tiêu hoàn tất'], ['WARNING', 'task.failed', 'Task lỗi'], ['INFO', 'system.resumed', 'Hệ thống chạy lại'], ['WARNING', 'approval.requested', 'Cần duyệt'],
  ])
  notifications.push(T(i, level, type, `${title} #${i}`, '', (6 + i * 2) * HOUR, { kind: 'TASK', id: String(5000 + i) }, i > 12))
}
