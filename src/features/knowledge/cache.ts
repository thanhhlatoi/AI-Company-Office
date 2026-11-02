import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { KnowledgeDoc } from '../../types/knowledge'

type Pages = InfiniteData<{ items: KnowledgeDoc[]; nextCursor?: string | null }>

/** Ghi đè một tài liệu vào mọi trang đã tải của bộ sưu tập (document.status_changed); tài liệu mới thì chèn vào đầu trang đầu. */
export function patchDocument(qc: QueryClient, doc: KnowledgeDoc) {
  qc.setQueryData<Pages>(['documents', doc.collectionId], (old) => {
    if (!old) return old
    const known = old.pages.some((p) => p.items.some((d) => d.id === doc.id))
    if (!known) return { ...old, pages: old.pages.map((p, i) => (i ? p : { ...p, items: [doc, ...p.items] })) }
    return { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.map((d) => (d.id === doc.id ? doc : d)) })) }
  })
}
