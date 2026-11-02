import { useState } from 'react'
import { SafeMarkdown } from '../history/SafeMarkdown'
import { useChunks, useDocuments } from '../studio/queries'

/** Xem trước đoạn của một tài liệu (số trang, mục, số token) để kiểm tra chất lượng cắt đoạn. Nội dung đoạn là dữ liệu KHÔNG tin cậy. */
export function ChunksTab({ collectionId }: { collectionId: string }) {
  const docs = useDocuments(collectionId)
  const ready = (docs.data?.pages.flatMap((p) => p.items) ?? []).filter((d) => d.chunkCount > 0)
  const [pick, setPick] = useState<string | null>(null)
  const id = pick ?? ready[0]?.id ?? null
  const q = useChunks(id)
  const rows = q.data?.pages.flatMap((p) => p.items) ?? []
  if (docs.isLoading) return <div className="h-32 animate-pulse rounded-card bg-slate-200" />
  if (!ready.length) return <p className="rounded-card border border-dashed border-slate-300 p-8 text-center text-sm text-slate-700">Chưa có tài liệu nào đã cắt đoạn. Đợi tài liệu xử lý xong ở tab Tài liệu.</p>
  return (
    <section aria-label="Xem trước đoạn" className="space-y-3">
      <label className="block text-sm font-medium">Tài liệu<select value={id ?? ''} onChange={(e) => setPick(e.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2 py-1 font-normal">{ready.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.chunkCount} đoạn)</option>)}</select></label>
      {q.isLoading && <div className="h-32 animate-pulse rounded-card bg-slate-200" />}
      {q.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được đoạn. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>}
      <ol className="space-y-2">
        {rows.map((c) => (
          <li key={c.id} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 90px' }} className="rounded-card border border-slate-200 bg-white p-3">
            <p className="mb-1 flex flex-wrap gap-x-3 text-xs text-slate-700"><b>Đoạn {c.index}</b>{c.page != null && <span>trang {c.page}</span>}{c.section && <span>{c.section}</span>}<span>{c.tokens} token</span></p>
            <div className="text-sm"><SafeMarkdown text={c.text} /></div>
          </li>
        ))}
      </ol>
      {q.hasNextPage && <button disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()} className="w-full rounded-lg border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">Tải thêm đoạn</button>}
    </section>
  )
}
