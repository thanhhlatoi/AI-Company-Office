import { mockDb } from '../db'
import type { Grant, PermissionAudit, Secret, Tool } from '../../types/tools'
import { DAY, HOUR, rng } from '../biz/rng'

// Công cụ, quyền, bí mật giả (Prompt 4D). Dữ liệu cố ý có agent cấu hình quá rộng (CSKH) để thấy "tam giác rủi ro".
export const R = rng(40404)
export const NOW = Date.now()
export const iso = (ms: number) => new Date(ms).toISOString()
export const agentIdOf = (name: string) => mockDb.agents.find((a) => a.name === name)?.id ?? ''

const str = (title: string, extra: object = {}) => ({ type: 'string', title, ...extra })
const list = (title: string, def: string[] = []) => ({ type: 'array', title, items: { type: 'string' }, default: def })
const obj = (properties: object, required: string[] = []) => ({ type: 'object', properties, required })

type Seed = Omit<Tool, 'enabled' | 'adminFlagOn' | 'agentCount' | 'requiresAdminFlag'> & Partial<Pick<Tool, 'requiresAdminFlag'>>
const T: Seed[] = [
  { id: 'file_read', name: 'Đọc tệp', group: 'Tệp', risk: 'READ', description: 'Đọc tệp trong các thư mục được phép.', readsExternal: false, readsPrivate: true, sendsOut: false, scopeSchema: obj({ paths: list('Thư mục được đọc', ['/workspace']) }, ['paths']) },
  { id: 'file_write', name: 'Ghi tệp', group: 'Tệp', risk: 'WRITE_INTERNAL', description: 'Tạo hoặc sửa tệp trong thư mục làm việc.', readsExternal: false, readsPrivate: false, sendsOut: false, scopeSchema: obj({ paths: list('Thư mục được ghi', ['/workspace/out']), maxSizeMb: { type: 'integer', title: 'Kích thước tối đa (MB)', default: 10, minimum: 1 } }, ['paths']) },
  { id: 'file_delete', name: 'Xoá tệp', group: 'Tệp', risk: 'DESTRUCTIVE', requiresAdminFlag: true, description: 'Xoá tệp vĩnh viễn, không khôi phục được.', readsExternal: false, readsPrivate: false, sendsOut: false, scopeSchema: obj({ paths: list('Thư mục được xoá', []) }, ['paths']) },
  { id: 'web_search', name: 'Tìm kiếm web', group: 'Web', risk: 'READ', description: 'Tìm trên internet; kết quả là nội dung bên ngoài.', readsExternal: true, readsPrivate: false, sendsOut: false, scopeSchema: obj({ maxResults: { type: 'integer', title: 'Số kết quả tối đa', default: 5, minimum: 1, maximum: 20 } }) },
  { id: 'web_fetch', name: 'Mở trang web', group: 'Web', risk: 'READ', description: 'Tải nội dung một trang web.', readsExternal: true, readsPrivate: false, sendsOut: false, scopeSchema: obj({ allowedHosts: list('Tên miền được mở', []) }, ['allowedHosts']) },
  { id: 'email_read', name: 'Đọc thư đến', group: 'Thư', risk: 'READ', description: 'Đọc hộp thư đến của một tài khoản; thư là nội dung bên ngoài.', readsExternal: true, readsPrivate: true, sendsOut: false, scopeSchema: obj({ account: str('Tài khoản thư', { 'x-secretKind': 'email' }), folders: list('Thư mục', ['INBOX']) }, ['account']) },
  { id: 'email_send', name: 'Gửi thư', group: 'Thư', risk: 'EXTERNAL', description: 'Gửi thư ra ngoài công ty.', readsExternal: false, readsPrivate: false, sendsOut: true, scopeSchema: obj({ account: str('Tài khoản gửi', { 'x-secretKind': 'email' }), allowedDomains: list('Miền nhận được phép', []), dailyLimit: { type: 'integer', title: 'Tối đa mỗi ngày', default: 10, minimum: 1 } }, ['account', 'allowedDomains']) },
  { id: 'social_post', name: 'Đăng mạng xã hội', group: 'Xuất bản', risk: 'EXTERNAL', description: 'Đăng bài lên kênh công khai.', readsExternal: false, readsPrivate: false, sendsOut: true, scopeSchema: obj({ channel: str('Kênh', { 'x-secretKind': 'social' }), dailyLimit: { type: 'integer', title: 'Tối đa mỗi ngày', default: 3, minimum: 1 } }, ['channel']) },
  { id: 'kb_search', name: 'Tìm trong kho tài liệu', group: 'Dữ liệu', risk: 'READ', description: 'Tìm trong các bộ sưu tập kho mà agent được đọc.', readsExternal: false, readsPrivate: true, sendsOut: false, scopeSchema: obj({ topK: { type: 'integer', title: 'Số đoạn trả về', default: 5, minimum: 1, maximum: 20 } }) },
  { id: 'sheet_update', name: 'Cập nhật bảng tính', group: 'Dữ liệu', risk: 'WRITE_INTERNAL', description: 'Ghi vào một bảng tính nội bộ.', readsExternal: false, readsPrivate: false, sendsOut: false, scopeSchema: obj({ sheetId: str('Mã bảng tính'), ranges: list('Vùng được ghi', ['A:Z']) }, ['sheetId']) },
  { id: 'calendar_create', name: 'Tạo lịch hẹn', group: 'Lịch', risk: 'WRITE_INTERNAL', description: 'Tạo sự kiện trong lịch nội bộ.', readsExternal: false, readsPrivate: false, sendsOut: false, scopeSchema: obj({ calendar: str('Lịch', { default: 'company' }) }) },
  { id: 'payment_transfer', name: 'Chuyển tiền', group: 'Tài chính', risk: 'MONEY', requiresAdminFlag: true, description: 'Chuyển tiền cho một bên nhận.', readsExternal: false, readsPrivate: false, sendsOut: true, scopeSchema: obj({ account: str('Tài khoản chi', { 'x-secretKind': 'bank' }), maxAmountUsd: { type: 'number', title: 'Hạn mức mỗi lần (USD)', default: 50, minimum: 1 }, payees: list('Bên nhận được phép', []) }, ['account', 'payees']) },
]

export const tools: Tool[] = T.map((t) => ({ ...t, requiresAdminFlag: t.requiresAdminFlag ?? false, enabled: true, adminFlagOn: false, agentCount: 0 }))

export const secrets: Secret[] = [
  { id: 's1', name: 'Thư công ty (SMTP)', kind: 'email', createdAt: iso(NOW - 80 * DAY), rotatedAt: iso(NOW - 20 * DAY), lastUsedAt: iso(NOW - 2 * HOUR), usedBy: [] },
  { id: 's2', name: 'Hộp thư hỗ trợ', kind: 'email', createdAt: iso(NOW - 60 * DAY), rotatedAt: null, lastUsedAt: iso(NOW - 5 * HOUR), usedBy: [] },
  { id: 's3', name: 'Kênh YouTube chính', kind: 'social', createdAt: iso(NOW - 50 * DAY), rotatedAt: null, lastUsedAt: iso(NOW - DAY), usedBy: [] },
  { id: 's4', name: 'Tài khoản ngân hàng VCB', kind: 'bank', createdAt: iso(NOW - 70 * DAY), rotatedAt: iso(NOW - 10 * DAY), lastUsedAt: null, usedBy: [] },
  { id: 's5', name: 'Khoá API Anthropic', kind: 'llm', createdAt: iso(NOW - 90 * DAY), rotatedAt: null, lastUsedAt: iso(NOW - 600_000), usedBy: [] },
]

let gSeq = 0
export const grants: Grant[] = []
export const addGrant = (agent: string, toolId: string, scope: Record<string, unknown> = {}, extra: Partial<Grant> = {}) => {
  const agentId = agentIdOf(agent)
  if (!agentId) return
  const at = iso(NOW - R.int(1, 40) * DAY)
  grants.push({ id: `g${++gSeq}`, agentId, toolId, scope, limits: { maxCallsPerTask: 20, maxPerMinute: null, expiresAt: null }, alwaysApprove: false, secretId: null, createdAt: at, updatedAt: at, ...extra })
}
export const nextGrantId = () => `g${++gSeq}`

const mail = { account: 's2', allowedDomains: ['acme.com', 'khachhang.vn'], dailyLimit: 10 }
// Biên kịch / Dịch thuật / QA...: quyền vừa phải
for (const a of ['Biên kịch', 'Biên tập Qwen', 'Dịch thuật', 'Caption & Hashtag', 'Frontend', 'Backend', 'QA']) { addGrant(a, 'file_read', { paths: ['/workspace'] }); addGrant(a, 'file_write', { paths: ['/workspace/out'], maxSizeMb: 10 }) }
for (const a of ['Phân tích xu hướng', 'Biên kịch']) { addGrant(a, 'web_search', { maxResults: 5 }); addGrant(a, 'web_fetch', { allowedHosts: ['youtube.com', 'trends.google.com'] }) }
addGrant('Lên lịch đăng', 'social_post', { channel: 's3', dailyLimit: 3 }, { alwaysApprove: true })
addGrant('Thủ quỹ', 'payment_transfer', { account: 's4', maxAmountUsd: 50, payees: ['Công ty ABC'] }, { alwaysApprove: true })
addGrant('Kế toán thuế', 'sheet_update', { sheetId: 'sheet-thue-2026', ranges: ['A:F'] })
addGrant('Kế toán chi phí token', 'sheet_update', { sheetId: 'sheet-chi-phi', ranges: ['A:H'] })
addGrant('DevOps/NAS', 'file_delete', { paths: ['/storage/tmp'] })
addGrant('Thư ký lịch', 'calendar_create', { calendar: 'company' })
addGrant('Hermes', 'calendar_create', { calendar: 'company' })
addGrant('Hermes', 'kb_search', { topK: 5 })
// CSKH: dữ liệu riêng + đọc thư ngoài + gửi thư ra ngoài = TAM GIÁC RỦI RO; email_send quá rộng (không giới hạn miền)
addGrant('CSKH', 'kb_search', { topK: 8 })
addGrant('CSKH', 'email_read', { account: 's2', folders: ['INBOX'] })
addGrant('CSKH', 'email_send', { account: 's2', allowedDomains: [], dailyLimit: 200 })
// Sales: có sẵn quyền đọc kho + gửi thư giới hạn miền
addGrant('Sales', 'kb_search', { topK: 5 })
addGrant('Sales', 'email_send', mail)
addGrant('Mua hàng', 'web_search', { maxResults: 10 })
addGrant('Mua hàng', 'email_send', { account: 's1', allowedDomains: ['nhacungcap.vn'], dailyLimit: 5 })

for (const g of grants) {
  const t = tools.find((x) => x.id === g.toolId)
  if (t) t.agentCount += 1
  const sid = g.scope.account ?? g.scope.channel
  if (typeof sid === 'string') { const s = secrets.find((x) => x.id === sid); if (s) s.usedBy.push({ agentId: g.agentId, toolId: g.toolId }) }
}

export const audit: PermissionAudit[] = [
  { id: 'a3', at: iso(NOW - 2 * HOUR), actor: 'Chủ', agentId: agentIdOf('CSKH'), toolId: 'email_send', action: 'GRANT', before: null, after: { allowedDomains: [], dailyLimit: 200 }, reason: 'Thử nghiệm CSKH tự trả lời' },
  { id: 'a2', at: iso(NOW - 26 * HOUR), actor: 'Chủ', agentId: agentIdOf('Thủ quỹ'), toolId: 'payment_transfer', action: 'UPDATE', before: { maxAmountUsd: 100 }, after: { maxAmountUsd: 50 }, reason: 'Siết hạn mức' },
  { id: 'a1', at: iso(NOW - 3 * DAY), actor: 'Chủ', agentId: null, toolId: 'payment_transfer', action: 'ADMIN_FLAG', before: { adminFlagOn: false }, after: { adminFlagOn: false }, reason: null },
]
