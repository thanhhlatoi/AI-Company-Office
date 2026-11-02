import { Link } from 'react-router-dom'
import { useConversationContext } from '../studio/queries'
import { OriginBadge } from './OriginBadge'

/** Trong trình xem hội thoại: ký ức đã nạp vào task này và các đoạn tài liệu được trích dẫn (nguồn bấm được). Nội dung hiện dạng chữ. */
export function ConversationMemory({ id }: { id: string }) {
  const q = useConversationContext(id)
  if (q.isLoading) return <div className="h-8 animate-pulse rounded-lg bg-slate-200" />
  if (q.isError) return <p role="alert" className="text-xs text-red-800">Không tải được ký ức / nguồn của hội thoại này. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
  const { memories = [], citations = [] } = q.data ?? {}
  if (!memories.length && !citations.length) return null
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm" open>
      <summary className="cursor-pointer font-semibold">Ký ức và nguồn đã dùng ({memories.length} ký ức, {citations.length} trích dẫn)</summary>
      {memories.length > 0 && <section aria-label="Ký ức dùng trong task này" className="mt-2"><h3 className="text-xs font-semibold">Ký ức dùng trong task này</h3>
        <ul className="mt-1 space-y-1">{memories.map((m) => <li key={m.id} className="flex flex-wrap items-center gap-2 rounded bg-white p-1.5"><OriginBadge origin={m.origin} /><span className="min-w-0 flex-1 break-words">{m.content}</span>{m.subject && <span className="text-xs text-slate-700">({m.subject})</span>}</li>)}</ul>
        <Link to="/memory" className="mt-1 inline-block text-xs text-brand underline">Mở trang Bộ nhớ</Link></section>}
      {citations.length > 0 && <section aria-label="Đoạn tài liệu được trích dẫn" className="mt-2"><h3 className="text-xs font-semibold">Đoạn tài liệu được trích dẫn</h3>
        <ul className="mt-1 space-y-1">{citations.map((c) => <li key={c.chunkId} className="rounded bg-white p-1.5"><p className="flex flex-wrap items-center gap-2"><Link to={`/knowledge/${c.collectionId}?tab=chunks`} className="font-semibold text-brand underline">{c.documentName}{c.page != null ? ` · trang ${c.page}` : ''}</Link>
          {c.trust === 'EXTERNAL' && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-950">Bên ngoài</span>}</p><p className="mt-0.5 break-words text-xs text-slate-700">{c.snippet}</p></li>)}</ul></section>}
    </details>
  )
}
