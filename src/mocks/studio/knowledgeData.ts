import { mockDb } from '../db'
import { foldVi } from '../../lib/text'
import type { Chunk } from '../../types/knowledge'
import type { Collection, KnowledgeDoc } from '../../types/knowledge'
import { DAY, HOUR } from '../biz/rng'
import { iso, NOW, R } from './toolsData'

const deptId = (slug: string) => mockDb.departments.find((d) => d.slug === slug)?.id ?? null
const EMB_LOCAL = { id: 'nomic-embed-local', label: 'Nomic Embed (local)', dataClass: 'LOCAL' as const }
const EMB_CLOUD = { id: 'embed-cloud-v3', label: 'Embedding đám mây v3', dataClass: 'CLOUD' as const }

export const collections: Collection[] = [
  { id: 'col1', name: 'Chính sách công ty', description: 'Quy định nội bộ, quy trình, hướng dẫn.', sensitivity: 'INTERNAL', scope: { kind: 'SHARED' }, docCount: 8, indexState: 'READY', embeddingModel: EMB_CLOUD, embeddingCostMicro: 42_000, chunking: { size: 800, overlap: 100 }, acl: [{ kind: 'ALL', access: 'READ' }] },
  { id: 'col2', name: 'Hợp đồng khách hàng', description: 'Hợp đồng, phụ lục, báo giá đã ký.', sensitivity: 'CONFIDENTIAL', scope: { kind: 'DEPARTMENT', id: deptId('kinh-doanh') }, docCount: 7, indexState: 'INDEXING', embeddingModel: EMB_LOCAL, embeddingCostMicro: 0, chunking: { size: 600, overlap: 80 }, acl: [{ kind: 'DEPARTMENT', id: deptId('kinh-doanh'), access: 'READ' }] },
  { id: 'col3', name: 'Tư liệu kênh YouTube', description: 'Kịch bản mẫu, từ khoá, phân tích kênh.', sensitivity: 'PUBLIC', scope: { kind: 'DEPARTMENT', id: deptId('studio-youtube') }, docCount: 5, indexState: 'READY', embeddingModel: EMB_CLOUD, embeddingCostMicro: 9_500, chunking: { size: 800, overlap: 100 }, acl: [{ kind: 'DEPARTMENT', id: deptId('studio-youtube'), access: 'WRITE' }, { kind: 'DEPARTMENT', id: deptId('tiktok-shorts'), access: 'READ' }] },
]

const DOCS: [string, string, string, number, KnowledgeDoc['status'], KnowledgeDoc['trust']?][] = [ // tên, cột, mime, KB, trạng thái
  ['Nội quy làm việc.pdf', 'col1', 'application/pdf', 420, 'READY'], ['Quy trình duyệt chi.docx', 'col1', 'application/docx', 180, 'READY'], ['Chính sách hoàn tiền.md', 'col1', 'text/markdown', 24, 'READY'],
  ['Hướng dẫn bảo mật.pdf', 'col1', 'application/pdf', 610, 'READY'], ['Quy định sử dụng AI.md', 'col1', 'text/markdown', 31, 'READY'], ['Biểu mẫu nghỉ phép.docx', 'col1', 'application/docx', 95, 'READY'],
  ['Danh mục nhà cung cấp.csv', 'col1', 'text/csv', 48, 'READY'], ['Sổ tay nhân viên mới.pdf', 'col1', 'application/pdf', 1480, 'READY'],
  ['Hợp đồng ABC 2026.pdf', 'col2', 'application/pdf', 820, 'READY'], ['Phụ lục giá ABC.pdf', 'col2', 'application/pdf', 210, 'READY'], ['Hợp đồng Khách Việt.pdf', 'col2', 'application/pdf', 760, 'READY'],
  ['Báo giá Q4.docx', 'col2', 'application/docx', 130, 'READY'], ['Biên bản nghiệm thu (bản scan).pdf', 'col2', 'application/pdf', 3900, 'FAILED'],
  ['Hợp đồng Đại Nam.pdf', 'col2', 'application/pdf', 905, 'EMBEDDING'], ['Thư xác nhận đối tác.eml', 'col2', 'message/rfc822', 14, 'CHUNKING', 'EXTERNAL'],
  ['Kịch bản mẫu - review phim.md', 'col3', 'text/markdown', 18, 'READY'], ['Danh sách từ khoá Q4.csv', 'col3', 'text/csv', 66, 'READY'], ['Phân tích đối thủ.pdf', 'col3', 'application/pdf', 540, 'READY'],
  ['Bài viết xu hướng (nguồn web).html', 'col3', 'text/html', 77, 'READY', 'EXTERNAL'], ['Mẫu tiêu đề hay.md', 'col3', 'text/markdown', 9, 'READY'],
]
export const documents: KnowledgeDoc[] = DOCS.map(([name, collectionId, mime, kb, status, trust], i) => ({
  id: `doc${i + 1}`, collectionId, name, mime, sizeBytes: kb * 1024, status, trust: trust ?? 'OWNER',
  progressPct: status === 'EMBEDDING' ? 35 : status === 'CHUNKING' ? 60 : status === 'READY' ? 100 : 0,
  errorCode: status === 'FAILED' ? 'PDF_SCANNED_NO_OCR' : null,
  chunkCount: status === 'READY' ? Math.max(2, Math.min(40, Math.round(kb / 40))) : 0, version: 1,
  createdAt: iso(NOW - R.int(1, 25) * DAY - R.int(0, 20) * HOUR),
}))
export const recount = () => { for (const c of collections) c.docCount = documents.filter((d) => d.collectionId === c.id).length }

const POOL: Record<string, string[]> = {
  col1: ['Khách hàng được hoàn tiền trong vòng 14 ngày nếu sản phẩm lỗi.', 'Mọi khoản chi trên 1.000.000 đồng cần chủ duyệt trước khi thanh toán.', 'Không chia sẻ mật khẩu hay khoá API qua thư hoặc tin nhắn.', 'Nhân viên nghỉ phép phải báo trước ít nhất 3 ngày làm việc.', 'Dữ liệu khách hàng chỉ lưu trên hệ thống nội bộ, không sao chép ra ngoài.'],
  col2: ['Bên A thanh toán 30% đặt cọc khi ký hợp đồng.', 'Thời hạn hợp đồng 12 tháng, tự gia hạn nếu không bên nào thông báo.', 'Phạt vi phạm 8% giá trị hợp đồng khi chậm bàn giao quá 15 ngày.', 'Thông tin trong phụ lục giá là bí mật, không tiết lộ cho bên thứ ba.', 'Khách hàng được hỗ trợ kỹ thuật trong giờ hành chính.'],
  col3: ['Tiêu đề nên có con số và lời hứa rõ ràng, tối đa 60 ký tự.', 'Đoạn mở đầu 15 giây đầu quyết định tỉ lệ giữ chân người xem.', 'Từ khoá dài ít cạnh tranh phù hợp kênh nhỏ.', 'Đăng vào 19 giờ tối thứ Bảy cho lượt xem tốt nhất.', 'Thumbnail tương phản cao, tối đa ba từ.'],
}
export const chunksOf = (d: KnowledgeDoc): Chunk[] => Array.from({ length: d.chunkCount }, (_, i) => {
  const pool = POOL[d.collectionId] ?? POOL.col1
  return { id: `${d.id}-c${i + 1}`, documentId: d.id, index: i + 1, text: `${d.name.replace(/\.[a-z]+$/i, '')}: ${pool[(i + d.id.length) % pool.length]} ${pool[(i * 2 + 1) % pool.length]}`, page: 1 + Math.floor(i / 3), section: `Mục ${1 + Math.floor(i / 4)}`, tokens: 120 + ((i * 37) % 180) }
})

/** Quyền của agent với bộ sưu tập: mục AGENT thắng mục phòng ban, mục phòng ban thắng ALL (mục AGENT = NONE là chặn rõ ràng). */
export function accessOf(c: Collection, agentId: string): 'NONE' | 'READ' | 'WRITE' {
  const a = mockDb.agents.find((x) => x.id === agentId)
  const hit = c.acl.find((e) => e.kind === 'AGENT' && e.id === agentId) ?? c.acl.find((e) => e.kind === 'DEPARTMENT' && e.id === a?.departmentId) ?? c.acl.find((e) => e.kind === 'ALL')
  return hit?.access ?? 'NONE'
}
export const canRead = (c: Collection, agentId: string) => accessOf(c, agentId) !== 'NONE'
export const embeddingModels = [
  { id: EMB_LOCAL.id, label: EMB_LOCAL.label, dataClass: EMB_LOCAL.dataClass, pricePerMTokMicro: 0 },
  { id: EMB_CLOUD.id, label: EMB_CLOUD.label, dataClass: EMB_CLOUD.dataClass, pricePerMTokMicro: 100_000 },
]
export function search(collectionId: string, q: string, asAgent?: string) {
  const c = collections.find((x) => x.id === collectionId)
  if (!c) return { visible: false, hits: [] }
  if (asAgent && !canRead(c, asAgent)) return { visible: false, hits: [] }
  const terms = foldVi(q).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((t) => t.length > 1)
  const hits = documents.filter((d) => d.collectionId === collectionId && d.status === 'READY').flatMap((d) => chunksOf(d).map((ch) => {
    const hay = foldVi(ch.text), nameHay = foldVi(d.name), kw = (terms.filter((t) => hay.includes(t)).length + 2 * terms.filter((t) => nameHay.includes(t)).length) / (3 * (terms.length || 1)) // trùng tên tài liệu được tính nặng hơn
    const vec = Math.min(0.99, kw * 0.55 + ((ch.index * 13 + d.id.length * 7) % 40) / 100)
    return { chunkId: ch.id, documentId: d.id, documentName: d.name, page: ch.page, text: ch.text, score: { vector: +vec.toFixed(3), keyword: +kw.toFixed(3), fused: +(0.6 * vec + 0.4 * kw).toFixed(3) } }
  })).filter((h) => (h.score.keyword ?? 0) > 0).sort((a, b) => b.score.fused - a.score.fused).slice(0, 8)
  return { visible: true, hits }
}
export const evalSets = new Map<string, { questions: { id: string; question: string; expected: string }[]; runs: { id: string; at: string; k: number; recallAtK: number; mrr: number; misses: { question: string; expected: string }[] }[] }>([['col1', { questions: [{ id: 'q1', question: 'Hoàn tiền trong bao nhiêu ngày?', expected: 'Chính sách hoàn tiền.md' }, { id: 'q2', question: 'Chi trên bao nhiêu thì cần duyệt?', expected: 'Quy trình duyệt chi.docx' }], runs: [{ id: 'e1', at: iso(NOW - 3 * DAY), k: 5, recallAtK: 0.7, mrr: 0.52, misses: [{ question: 'Nghỉ phép báo trước mấy ngày?', expected: 'Biểu mẫu nghỉ phép.docx' }] }, { id: 'e2', at: iso(NOW - DAY), k: 5, recallAtK: 0.85, mrr: 0.66, misses: [] }] }]])
