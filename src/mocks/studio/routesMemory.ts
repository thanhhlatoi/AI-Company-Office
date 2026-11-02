import { ApiError } from '../../api/http'
import { foldVi } from '../../lib/text'
import type { MemoryEdit, NamespaceConfig } from '../../types/memory'
import { conversations } from '../biz/seedText'
import { chunksOf, documents } from './knowledgeData'
import { memory, namespaces, recountNs } from './memoryData'
import { iso } from './toolsData'

const fail = (status: number, message: string): never => { throw new ApiError(status, `Mock ${status}: ${message}`, { message }) }
const itemOf = (id: string) => memory.find((m) => m.id === id) ?? fail(404, `không có mục bộ nhớ ${id}`)
const live = (m: { status: string }) => m.status !== 'REJECTED' && m.status !== 'EXPIRED'
const matches = (subject: string, agentId?: string) => { const s = foldVi(subject.trim()); return memory.filter((m) => live(m) && (!agentId || m.agentId === agentId) && !!s && foldVi(m.subject ?? '').includes(s)) }

/** Mock ghi / xem xét / quên / xuất của Bộ nhớ (Bước 6). undefined = không phải route này. */
export function memoryRoute(method: string, path: string, body: unknown, q: URLSearchParams): unknown {
  const b = (body ?? {}) as Record<string, unknown>
  let m: RegExpMatchArray | null
  if (method === 'PUT' && (m = path.match(/^\/memory\/namespaces\/([^/]+)$/))) {
    const n = namespaces.find((x) => x.id === m![1]) ?? fail(404, `không có không gian tên ${m[1]}`), c = b as unknown as NamespaceConfig
    if (!(c.limit >= 1)) fail(400, 'Giới hạn phải từ 1 trở lên')
    return Object.assign(n, { limit: c.limit, ttlDays: c.ttlDays ?? null, requireReview: c.requireReview })
  }
  if (method === 'GET' && path === '/memory/export') { const a = q.get('agentId'); return { agentId: a, exportedAt: iso(Date.now()), items: memory.filter((x) => live(x) && (!a || x.agentId === a)) } }
  if (method === 'PUT' && (m = path.match(/^\/memory\/([^/]+)$/))) {
    const it = itemOf(m[1]), e = b as MemoryEdit
    if (e.content !== undefined) { if (!e.content.trim()) fail(400, 'Nội dung không được để trống'); if (e.content !== it.content) { it.content = e.content; it.editedByOwner = true } }
    if (e.pinned !== undefined) it.pinned = e.pinned
    if (e.importance !== undefined) it.importance = Math.min(5, Math.max(1, Math.round(e.importance)))
    return it
  }
  if (method === 'DELETE' && (m = path.match(/^\/memory\/([^/]+)$/))) { memory.splice(memory.indexOf(itemOf(m[1])), 1); recountNs(); return null }
  if (method === 'POST' && (m = path.match(/^\/memory\/([^/]+)\/review$/))) {
    const it = itemOf(m[1])
    if (it.status !== 'PENDING_REVIEW') fail(409, 'Mục này đã được xem xét')
    if (b.decision === 'APPROVE') { it.status = 'ACTIVE'; if (typeof b.content === 'string' && b.content.trim() && b.content !== it.content) { it.content = b.content; it.editedByOwner = true } } else it.status = 'REJECTED'
    recountNs(); return it
  }
  if (method === 'POST' && path === '/memory/review/bulk') {
    const ids = (b.ids ?? []) as string[]; let n = 0
    for (const id of ids) { const it = memory.find((x) => x.id === id); if (it?.status === 'PENDING_REVIEW') { it.status = b.decision === 'APPROVE' ? 'ACTIVE' : 'REJECTED'; n++ } }
    recountNs(); return { updated: n }
  }
  if (method === 'POST' && path === '/memory/forget/preview') { const hit = matches(String(b.subject ?? ''), b.agentId as string | undefined); return { count: hit.length, samples: hit.slice(0, 5).map((x) => x.content) } }
  if (method === 'POST' && path === '/memory/forget') {
    const hit = matches(String(b.subject ?? ''), b.agentId as string | undefined)
    if (!hit.length) fail(400, 'Không có mục nào khớp để quên')
    for (const x of hit) memory.splice(memory.indexOf(x), 1)
    recountNs(); return { deleted: hit.length }
  }
  if (method === 'GET' && (m = path.match(/^\/conversations\/([^/]+)\/context$/))) {
    const c = conversations.find((x) => x.id === m![1]) ?? fail(404, `không có hội thoại ${m[1]}`)
    const mine = memory.filter((x) => (x.agentId === c.agentId || x.namespaceId === 'ns-company') && x.status === 'ACTIVE').slice(0, 3) // ký ức của agent + ký ức chung toàn công ty
    const doc = documents.find((d) => d.status === 'READY' && d.collectionId === 'col1' && d.chunkCount > 0)
    const ext = documents.find((d) => d.status === 'READY' && d.trust === 'EXTERNAL')
    const cite = (d: typeof documents[number] | undefined) => (d ? [{ chunkId: chunksOf(d)[0].id, collectionId: d.collectionId, documentId: d.id, documentName: d.name, page: chunksOf(d)[0].page ?? null, snippet: chunksOf(d)[0].text.slice(0, 140), trust: d.trust }] : [])
    return { memories: mine.map((x) => ({ id: x.id, content: x.content, origin: x.origin, subject: x.subject ?? null })), citations: Number(c.id.replace(/\D/g, '')) % 2 ? [...cite(doc), ...cite(ext)] : cite(doc) }
  }
  return undefined
}
