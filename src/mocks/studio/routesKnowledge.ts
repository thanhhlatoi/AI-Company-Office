import { ApiError } from '../../api/http'
import type { Collection, CollectionInput, KnowledgeDoc } from '../../types/knowledge'
import type { StudioConfig } from '../../types/studio'
import { mockDb } from '../db'
import { accessOf, collections, documents, embeddingModels, evalSets, recount, search } from './knowledgeData'
import { namespaces } from './memoryData'
import { studioConfigs, studioOf } from './logsData'
import { iso } from './toolsData'

const fail = (status: number, message: string, extra: object = {}): never => { throw new ApiError(status, `Mock ${status}: ${message}`, { message, ...extra }) }
let seq = 500
const colOf = (id: string) => collections.find((c) => c.id === id) ?? fail(404, `không có bộ sưu tập ${id}`)
const docOf = (id: string) => documents.find((d) => d.id === id) ?? fail(404, `không có tài liệu ${id}`)
const EXT = ['pdf', 'docx', 'md', 'txt', 'csv', 'html', 'eml']

/** BE chặn: dữ liệu mật không được nhúng bằng model CLOUD */
function apply(c: Collection, i: CollectionInput) {
  const emb = embeddingModels.find((e) => e.id === i.embeddingModelId) ?? fail(400, 'Model embedding không tồn tại')
  if (i.sensitivity === 'CONFIDENTIAL' && emb.dataClass !== 'LOCAL') fail(400, 'Bộ sưu tập CONFIDENTIAL phải dùng model embedding LOCAL')
  Object.assign(c, { name: i.name, description: i.description, sensitivity: i.sensitivity, scope: { kind: i.scope.kind, id: i.scope.id ?? null }, chunking: i.chunking, acl: i.acl.map((e) => ({ ...e, id: e.id ?? null })), syncFolder: i.syncFolder ?? null, embeddingModel: { id: emb.id, label: emb.label, dataClass: emb.dataClass } })
  return c
}
function addDoc(collectionId: string, b: Record<string, unknown>, replace?: KnowledgeDoc): KnowledgeDoc {
  const name = String(b.name ?? ''), ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (!EXT.includes(ext)) fail(415, 'Định dạng không được hỗ trợ', { reasonCode: 'UNSUPPORTED_TYPE' })
  if (Number(b.sizeBytes) > 50 * 1024 * 1024) fail(413, 'Tệp quá lớn', { reasonCode: 'TOO_LARGE' })
  const base = { name, mime: String(b.mime ?? ''), sizeBytes: Number(b.sizeBytes ?? 0), status: 'UPLOADED' as const, progressPct: 0, errorCode: null, chunkCount: 0, createdAt: iso(Date.now()) }
  if (replace) return Object.assign(replace, base, { version: replace.version + 1, trust: (b.trust as KnowledgeDoc['trust']) ?? replace.trust })
  const d: KnowledgeDoc = { id: `doc${++seq}`, collectionId, trust: b.trust === 'EXTERNAL' ? 'EXTERNAL' : 'OWNER', version: 1, ...base }
  documents.push(d); recount(); return d
}

/** Mock ghi của Kho tài liệu + tab Dữ liệu của Studio (Bước 5). undefined = không phải route này. */
export function knowledgeRoute(method: string, path: string, body: unknown): unknown {
  const b = (body ?? {}) as Record<string, unknown>
  let m: RegExpMatchArray | null
  if (method === 'GET' && path === '/embedding-models') return embeddingModels
  if (method === 'POST' && path === '/collections') {
    const c = apply({ id: `col${++seq}`, docCount: 0, indexState: 'READY', embeddingCostMicro: 0 } as Collection, b as unknown as CollectionInput)
    collections.push(c); return c
  }
  if (method === 'PUT' && (m = path.match(/^\/collections\/([^/]+)$/))) return apply(colOf(m[1]), b as unknown as CollectionInput)
  if (method === 'POST' && (m = path.match(/^\/collections\/([^/]+)\/reindex$/))) {
    const c = colOf(m[1]), emb = embeddingModels.find((e) => e.id === b.embeddingModelId) ?? fail(400, 'Model embedding không tồn tại')
    if (c.sensitivity === 'CONFIDENTIAL' && emb.dataClass !== 'LOCAL') fail(400, 'Bộ sưu tập CONFIDENTIAL phải dùng model embedding LOCAL')
    if (c.indexState === 'REINDEXING') fail(409, 'Đang dựng lại chỉ mục')
    c.embeddingModel = { id: emb.id, label: emb.label, dataClass: emb.dataClass }; c.indexState = 'REINDEXING'; c.reindexPct = 0; return c
  }
  if (method === 'POST' && (m = path.match(/^\/collections\/([^/]+)\/sync$/))) { if (!colOf(m[1]).syncFolder) fail(400, 'Chưa cấu hình thư mục đồng bộ'); return { queued: 2 } }
  if (method === 'POST' && (m = path.match(/^\/collections\/([^/]+)\/documents$/))) return addDoc(colOf(m[1]).id, b)
  if (method === 'POST' && (m = path.match(/^\/documents\/([^/]+)\/replace$/))) { const d = docOf(m[1]); return addDoc(d.collectionId, b, d) }
  if (method === 'POST' && (m = path.match(/^\/documents\/([^/]+)\/reprocess$/))) { const d = docOf(m[1]); Object.assign(d, { status: 'EXTRACTING', progressPct: 0, errorCode: null }); return d }
  if (method === 'DELETE' && (m = path.match(/^\/documents\/([^/]+)$/))) { documents.splice(documents.indexOf(docOf(m[1])), 1); recount(); return null }
  if (method === 'POST' && (m = path.match(/^\/collections\/([^/]+)\/eval\/questions$/))) {
    const set = evalSets.get(colOf(m[1]).id) ?? { questions: [], runs: [] }; evalSets.set(m[1], set)
    if (!String(b.question ?? '').trim() || !String(b.expected ?? '').trim()) fail(400, 'Cần câu hỏi và tài liệu đúng')
    const q = { id: `q${++seq}`, question: String(b.question), expected: String(b.expected) }; set.questions.push(q); return q
  }
  if (method === 'DELETE' && (m = path.match(/^\/collections\/([^/]+)\/eval\/questions\/([^/]+)$/))) { const set = evalSets.get(m[1]); if (set) set.questions = set.questions.filter((q) => q.id !== m![2]); return null }
  if (method === 'POST' && (m = path.match(/^\/collections\/([^/]+)\/eval\/run$/))) {
    const set = evalSets.get(colOf(m[1]).id), k = Number(b.k ?? 5)
    if (!set?.questions.length) return fail(400, 'Chưa có câu hỏi nào để chạy')
    const misses: { question: string; expected: string }[] = []; let hit = 0, rr = 0
    for (const q of set.questions) {
      const rank = search(m[1], q.question).hits.findIndex((h) => h.documentName === q.expected)
      if (rank >= 0 && rank < k) { hit++; rr += 1 / (rank + 1) } else misses.push({ question: q.question, expected: q.expected })
    }
    const run = { id: `e${++seq}`, at: iso(Date.now()), k, recallAtK: +(hit / set.questions.length).toFixed(2), mrr: +(rr / set.questions.length).toFixed(2), misses }
    set.runs.push(run); return run
  }
  if (method === 'PUT' && (m = path.match(/^\/agents\/([^/]+)\/studio$/))) {
    const agentId = m[1], cur = studioOf(agentId), c = b as unknown as Pick<StudioConfig, 'memoryPolicy' | 'collections' | 'namespaces'>
    if (!mockDb.agents.some((a) => a.id === agentId)) fail(404, `không có agent ${agentId}`)
    for (const e of c.collections) { // quyền kho lưu vào ACL của bộ sưu tập (mục AGENT)
      const col = colOf(e.collectionId), old = accessOf(col, agentId)
      if (old === e.access) continue
      col.acl = col.acl.filter((x) => !(x.kind === 'AGENT' && x.id === agentId)); col.acl.push({ kind: 'AGENT', id: agentId, access: e.access })
    }
    for (const n of c.namespaces) if (!namespaces.some((x) => x.id === n.namespaceId)) fail(400, `không có không gian tên ${n.namespaceId}`)
    studioConfigs.set(agentId, { ...cur, memoryPolicy: c.memoryPolicy, namespaces: c.namespaces })
    return studioOf(agentId)
  }
  return undefined
}
