import { foldVi } from '../../lib/text'
import type { MemoryItem, MemoryNamespace } from '../../types/memory'
import { DAY, HOUR } from '../biz/rng'
import { agentIdOf, iso, NOW, R } from './toolsData'

// 60 mục bộ nhớ ở 4 không gian tên; 5 mục chờ xem xét, suy ra từ nội dung bên ngoài.
const NS: [string, string, string][] = [['ns-cskh', 'CSKH', 'CSKH'], ['ns-sales', 'Sales', 'Sales'], ['ns-hermes', 'Hermes', 'Hermes'], ['ns-thuquy', 'Thủ quỹ', 'Thủ quỹ']]
export const namespaces: MemoryNamespace[] = [
  ...NS.map(([id, name, agent]) => ({ id, name: `Bộ nhớ ${name}`, agentId: agentIdOf(agent), limit: 500, ttlDays: 180, requireReview: id === 'ns-cskh' || id === 'ns-sales', itemCount: 0, pendingCount: 0 })),
  { id: 'ns-company', name: 'Chung toàn công ty', agentId: null, limit: 1000, ttlDays: null, requireReview: true, itemCount: 0, pendingCount: 0 },
]
const SUBJECTS = ['Khách hàng ABC', 'Khách Việt', 'Công ty Đại Nam', 'Nhà cung cấp Hải Long', null]
const FACTS = ['thích nhận báo giá bằng thư, không gọi điện', 'thanh toán chậm 7 ngày so với hạn, cần nhắc trước 3 ngày', 'người liên hệ chính là chị Lan, phòng mua hàng', 'ưu tiên giao hàng buổi sáng', 'đã khiếu nại về lô hàng tháng 9, đã xử lý xong', 'muốn hoá đơn xuất theo từng đợt', 'dùng giờ Singapore cho mọi cuộc họp']
const KINDS = ['FACT', 'PREFERENCE', 'EVENT', 'PROCEDURE'] as const

export const memory: MemoryItem[] = Array.from({ length: 60 }, (_, i) => {
  const ns = namespaces[i % 5]
  const subject = SUBJECTS[i % SUBJECTS.length]
  const pending = i >= 55
  const origin = pending ? 'EXTERNAL_INFERRED' : R.weighted([['OWNER', 3], ['AGENT_OBSERVED', 5], ['EXTERNAL_INFERRED', 1]] as const)
  return {
    id: `m${i + 1}`, namespaceId: ns.id, agentId: ns.agentId ?? null, kind: KINDS[i % 4],
    content: `${subject ?? 'Công ty'} ${FACTS[i % FACTS.length]}.`, subject,
    importance: 1 + (i % 5), origin, confidence: pending ? 0.45 : +(0.6 + (i % 4) / 10).toFixed(2),
    status: pending ? 'PENDING_REVIEW' : 'ACTIVE', pinned: i % 17 === 0, editedByOwner: origin === 'OWNER' && i % 2 === 0,
    createdAt: iso(NOW - R.int(1, 60) * DAY - R.int(0, 20) * HOUR), lastAccessedAt: i % 3 ? iso(NOW - R.int(1, 10) * DAY) : null, expiresAt: i % 11 === 0 ? iso(NOW + 20 * DAY) : null,
    source: pending ? { taskId: String(5000 + i), externalRefs: ['https://tin-tuc.example.com/bai-viet-' + i, 'Thư đến từ nguoi.la@example.org'] } : origin === 'EXTERNAL_INFERRED' ? { taskId: String(5100 + i), externalRefs: ['Trang web đối tác'] } : { taskId: String(5200 + i), externalRefs: [] },
  }
})
export const recountNs = () => {
  for (const n of namespaces) { const own = memory.filter((m) => m.namespaceId === n.id); n.itemCount = own.filter((m) => m.status === 'ACTIVE' || m.status === 'PENDING_REVIEW').length; n.pendingCount = own.filter((m) => m.status === 'PENDING_REVIEW').length }
}
recountNs()

export function memoryPage(q: URLSearchParams) {
  const text = foldVi(q.get('q') ?? ''), pick = (k: string) => q.get(k) ?? ''
  const rows = memory.filter((m) => (!pick('agentId') || m.agentId === pick('agentId')) && (!pick('namespaceId') || m.namespaceId === pick('namespaceId')) && (!pick('kind') || m.kind === pick('kind'))
    && (!pick('origin') || m.origin === pick('origin')) && (!pick('status') || m.status === pick('status')) && (!pick('subject') || foldVi(m.subject ?? '').includes(foldVi(pick('subject'))))
    && (!q.get('pinned') || m.pinned) && (!text || foldVi(`${m.content} ${m.subject ?? ''}`).includes(text)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const size = Number(q.get('limit') ?? 40), at = Number(q.get('cursor') ?? 0)
  return { items: rows.slice(at, at + size), total: rows.length, nextCursor: at + size < rows.length ? String(at + size) : null }
}
