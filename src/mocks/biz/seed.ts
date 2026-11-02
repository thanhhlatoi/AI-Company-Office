import { mockDb, mockTask } from '../db'
import type { Agent, Priority, Task } from '../../types'
import type { Budget, ModelPrice } from '../../types/cost'
import type { Project } from '../../types/project'
import { DAY, HOUR, MIN, rng } from './rng'

// 30 ngày dữ liệu giả cho Kanban / dự án / chi phí / dashboard (Prompt 3C). Tiền = micro-USD.
export const R = rng(20261101)
export const NOW = Date.now()
const iso = (ms: number) => new Date(ms).toISOString()

export interface Call { at: number; agentId: string; model: string; inTok: number; outTok: number; costMicro: number | null; taskId: string; projectId: string | null }

export const PRICES: ModelPrice[] = [
  { id: 'pr1', model: 'claude-haiku-5-5', inputPerMTokMicro: 1_000_000, outputPerMTokMicro: 5_000_000, effectiveFrom: iso(NOW - 60 * DAY) },
  { id: 'pr2', model: 'claude-sonnet-5-5', inputPerMTokMicro: 3_000_000, outputPerMTokMicro: 15_000_000, effectiveFrom: iso(NOW - 60 * DAY) },
  { id: 'pr3', model: 'claude-opus-5-5', inputPerMTokMicro: 15_000_000, outputPerMTokMicro: 75_000_000, effectiveFrom: iso(NOW - 60 * DAY) },
  // claude-fable-5-1 cố ý KHÔNG có giá -> các cuộc gọi của nó là "chưa có giá"
]
/** Giá hiệu lực tại thời điểm `at`: bản ghi mới nhất có ngày hiệu lực <= at */
const priceOf = (model: string, at: number) => PRICES.filter((p) => p.model === model && Date.parse(p.effectiveFrom) <= at).sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0]
export const costOf = (model: string, inTok: number, outTok: number, at = Date.now()): number | null => {
  const p = priceOf(model, at)
  return p ? Math.round((inTok * p.inputPerMTokMicro + outTok * p.outputPerMTokMicro) / 1_000_000) : null
}
export const modelOf = (a: Agent) => (a.id === '1' || a.id === '2' ? 'claude-fable-5-1' : a.isHead || a.name.includes('Kiểm duyệt') ? 'claude-opus-5-5' : Number(a.id) % 5 === 0 ? 'claude-haiku-5-5' : 'claude-sonnet-5-5')

const PROJECTS: [string, string, string, string, number, number][] = [ // id, tên, slug phòng, màu, hạn (ngày từ nay), tỉ lệ xong
  ['p1', 'Kênh YouTube Q4', 'studio-youtube', '#c93d31', 21, 0.6],
  ['p2', 'Chiến dịch TikTok Tết', 'tiktok-shorts', '#a8379a', -3, 0.2], // hạn đã qua -> trễ
  ['p3', 'Nâng cấp website', 'cong-nghe-web', '#2563eb', 7, 0.95],
]
export const projects: Project[] = PROJECTS.map(([id, name, slug, color, due, ], i) => ({
  id, name, description: `Dự án giả #${i + 1}`, departmentId: mockDb.departments.find((d) => d.slug === slug)?.id ?? null, color,
  dueDate: iso(NOW + due * DAY), status: 'ACTIVE', budgetMicro: [8_000_000, 3_000_000, 5_000_000][i], costMicro: 0, progressPct: 0,
  counts: { queued: 0, running: 0, awaitingApproval: 0, waitingBudget: 0, done: 0, failed: 0, cancelled: 0 }, goalIds: [], createdAt: iso(NOW - 40 * DAY),
}))
const projectOfAgent = (a: Agent) => projects.find((p) => p.departmentId === a.departmentId)?.id ?? null
export const OVERLOADED = mockDb.agents.find((a) => a.name === 'Biên kịch') as Agent // nhiều việc chờ -> "có thể quá tải"
export const OVER_BUDGET = mockDb.agents.find((a) => a.name === 'Thủ quỹ') as Agent // vượt ngân sách ngày

const TITLES = ['Viết kịch bản video', 'Dựng clip ngắn', 'Đối soát công nợ', 'Lập báo cáo tuần', 'Cập nhật pipeline', 'Dịch phụ đề', 'Kiểm duyệt nội dung', 'Tối ưu tiêu đề', 'Soạn email khách hàng', 'Kiểm thử giao diện', 'Phân tích xu hướng', 'Lên lịch đăng bài']
export const ERRORS = ['Hết thời gian chờ API', 'Model trả về rỗng', 'Lỗi 429: quá giới hạn tốc độ', 'Không đọc được tệp đầu vào', 'Kết quả không qua kiểm duyệt']

/** mục tiêu -> dự án (BE giả: mục tiêu nằm trong work.ts, dự án nằm ở đây; dùng chung bản đồ để tính goalIds) */
export const goalProject = new Map<string, string>()
export const bizTasks: Task[] = []
/** Thứ tự trong cột Chờ (nhỏ = chạy trước) khi người dùng kéo đổi chỗ; mặc định theo giờ tạo. */
export const orderKey = new Map<string, number>()
export const ord = (t: Task) => orderKey.get(t.id) ?? Date.parse(t.createdAt)
export const calls: Call[] = []
let seq = 5000

function addCalls(t: Task, agent: Agent, from: number, to: number, n: number) {
  for (let i = 0; i < n; i++) {
    const inTok = R.int(500, 6000), outTok = R.int(200, 2500), model = modelOf(agent)
    const c: Call = { at: R.int(from, Math.max(from, to)), agentId: agent.id, model, inTok, outTok, costMicro: costOf(model, inTok, outTok, NOW), taskId: t.id, projectId: t.projectId ?? null }
    calls.push(c)
    t.costMicro += c.costMicro ?? 0
    t.tokensUsed += inTok + outTok
  }
}

function make(agent: Agent, status: Task['status'], age: number, projectId: string | null, extra: Partial<Task> = {}): Task {
  const createdAt = NOW - age - R.int(0, HOUR) // lệch ngẫu nhiên để không có hai thẻ trùng giờ tạo (thứ tự hàng chờ rõ ràng)
  const wait = R.int(2, 40) * MIN
  const startedAt = createdAt + wait
  const terminal = status === 'DONE' || status === 'FAILED' || status === 'CANCELLED'
  const dur = Math.round(Math.exp(R.next() * 4.6 + 3.4)) * 1000 // 30s .. ~50 phút, lệch phải
  const updatedAt = terminal ? Math.min(NOW - 1000, startedAt + dur) : status === 'RUNNING' ? startedAt : createdAt
  const t = mockTask({
    id: String(seq++), agentId: agent.id, title: `${R.pick(TITLES)} #${seq - 5000}`, input: '', status, result: status === 'DONE' ? '## Kết quả\n\nĐã xong.' : null,
    createdAt: iso(createdAt), updatedAt: iso(updatedAt), startedAt: status === 'QUEUED' || status === 'WAITING_BUDGET' ? null : iso(startedAt),
    priority: R.weighted<Priority>([['HIGH', 2], ['NORMAL', 6], ['LOW', 2]]), projectId,
    attempts: status === 'DONE' ? R.weighted([[1, 8], [2, 2]]) : status === 'FAILED' ? R.int(2, 3) : status === 'QUEUED' || status === 'WAITING_BUDGET' ? 0 : 1,
    error: status === 'FAILED' ? R.pick(ERRORS) : null, locked: status === 'AWAITING_APPROVAL', ...extra,
  })
  if (terminal && status !== 'CANCELLED') addCalls(t, agent, startedAt, updatedAt, R.int(1, 3))
  bizTasks.push(t)
  return t
}

// ---- Tạo dữ liệu ----
const staff = mockDb.agents.filter((a) => !a.isHead)
for (const [id, , , , , done] of PROJECTS) {
  const pool = staff.filter((a) => projectOfAgent(a) === id)
  const n = id === 'p1' ? 90 : id === 'p2' ? 50 : 40
  for (let i = 0; i < n; i++) {
    const a = R.pick(pool), age = R.int(1, 29 * 24) * HOUR
    const status = R.next() < done ? 'DONE' : R.weighted<Task['status']>([['QUEUED', 6], ['FAILED', 1.5], ['CANCELLED', 0.5]])
    make(a, status, status === 'QUEUED' ? Math.min(age, 4 * DAY) : age, id)
  }
}
for (let i = 0; i < 170; i++) { // việc không thuộc dự án, trải đều 30 ngày
  const a = R.pick(staff), st = R.weighted<Task['status']>([['DONE', 85], ['FAILED', 9], ['CANCELLED', 3]])
  make(a, st, R.int(1, 29 * 24) * HOUR, null)
}
for (let i = 0; i < 60; i++) make(R.pick(staff), 'QUEUED', R.int(1, 3 * 24) * HOUR, null) // cột "Chờ" > 50 thẻ để thử "Tải thêm"
for (let i = 0; i < 12; i++) make(OVERLOADED, 'QUEUED', R.int(1, 30) * HOUR, null) // hàng đợi dài
for (let i = 0; i < 4; i++) make(R.pick(staff), 'RUNNING', R.int(5, 40) * MIN, null)
for (let i = 0; i < 3; i++) make(R.pick(staff), 'AWAITING_APPROVAL', R.int(20, 90) * MIN, null)
for (let i = 0; i < 2; i++) make(OVER_BUDGET, 'WAITING_BUDGET', R.int(10, 50) * MIN, null)
for (let i = 0; i < 6; i++) { // vài task cha có tiến độ
  const p = bizTasks[R.int(0, 100)]
  p.progressPct = R.int(10, 90)
}
// Agent vượt ngân sách ngày: nhiều cuộc gọi trong hôm nay
{ const t = make(OVER_BUDGET, 'DONE', 3 * HOUR, null); for (let i = 0; i < 12; i++) addCalls(t, OVER_BUDGET, NOW - 10 * HOUR, NOW - HOUR, 1) }

// ---- Ngân sách ----
export const periodStart = (period: Budget['period']) => (period === 'DAY' ? NOW - (NOW % DAY) : period === 'MONTH' ? NOW - 30 * DAY : 0)
export const sumCalls = (pred: (c: Call) => boolean, since: number) => calls.filter((c) => c.at >= since && pred(c)).reduce((s, c) => s + (c.costMicro ?? 0), 0)
/** vị từ chọn các cuộc gọi thuộc phạm vi của từng ngân sách (để tính lại "đã dùng" mỗi lần đọc) */
export const budgetPred = new Map<string, (c: Call) => boolean>()
const mkBudget = (id: string, scopeType: Budget['scopeType'], scopeId: string | null, scopeLabel: string, period: Budget['period'], pred: (c: Call) => boolean, used: (u: number) => number, warnPct = 80): Budget => {
  budgetPred.set(id, pred)
  const u = sumCalls(pred, periodStart(period))
  return { id, scopeType, scopeId, scopeLabel, period, limitMicro: Math.max(10_000, Math.round(used(u))), usedMicro: u, reservedMicro: 0, waitingTasks: 0, warnPct, mode: 'BLOCK', state: 'OK' }
}
export const budgets: Budget[] = [
  mkBudget('b1', 'COMPANY', null, 'Cả công ty', 'MONTH', () => true, (u) => u / 0.7), // ~70% (còn dư để thêm giá model không làm cả công ty hết ngân sách)
  mkBudget('b2', 'AGENT', OVER_BUDGET.id, OVER_BUDGET.name, 'DAY', (c) => c.agentId === OVER_BUDGET.id, (u) => u * 0.6), // vượt hạn mức -> chặn
  mkBudget('b3', 'PROJECT', 'p1', 'Kênh YouTube Q4', 'TOTAL', (c) => c.projectId === 'p1', (u) => u * 2),
  mkBudget('b4', 'DEPARTMENT', projects[0].departmentId ?? null, 'Studio YouTube', 'DAY', (c) => mockDb.agents.find((a) => a.id === c.agentId)?.departmentId === projects[0].departmentId, (u) => Math.max(u * 2, 500_000)),
]
export const stateOf = (b: Budget): Budget['state'] => {
  const x = b.usedMicro + b.reservedMicro
  return x >= b.limitMicro ? 'HARD' : x >= (b.limitMicro * b.warnPct) / 100 ? 'SOFT' : 'OK'
}
for (const b of budgets) b.state = stateOf(b)
