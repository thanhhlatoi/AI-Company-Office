import { formatDateTime } from '../../../lib/time'
import { ErrorBanner } from '../../../components/ErrorBanner'
import { useDeliveries, useResend } from './hooks'

const BADGE = { SENT: ['Đã gửi', 'bg-green-100 text-green-800'], FAILED: ['Lỗi', 'bg-amber-100 text-amber-900'], DEAD: ['Hết lần thử', 'bg-red-100 text-red-800'] } as const

/** Lịch sử giao hàng Telegram/Email; gửi lại các tin lỗi. */
export function Deliveries() {
  const q = useDeliveries()
  const resend = useResend()
  const items = q.data?.pages.flatMap((p) => p.items) ?? []
  return (
    <section aria-labelledby="dl" className="rounded-card border border-slate-300 bg-white p-4">
      <h2 id="dl" className="text-lg font-semibold">Lịch sử giao hàng</h2>
      {q.isError && <div className="mt-2"><ErrorBanner message="Không tải được lịch sử giao hàng." onRetry={() => void q.refetch()} /></div>}
      {q.isLoading && <div className="mt-2 space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}</div>}
      {!q.isLoading && !q.isError && items.length === 0 && <p className="mt-2 text-sm text-slate-600">Chưa gửi tin nào qua Telegram hoặc Email.</p>}
      {items.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100">
          {items.map((d) => {
            const [text, cls] = BADGE[d.status]
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{text}</span>
                <span className="w-16 text-xs font-medium text-slate-600">{d.channel === 'TELEGRAM' ? 'Telegram' : 'Email'}</span>
                <span className="min-w-0 flex-1 truncate" title={d.title}>{d.title}{d.error && <span className="ml-2 text-xs text-red-700">{d.error}</span>}</span>
                <time className="text-xs text-slate-600">{formatDateTime(d.createdAt)}</time>
                {d.status !== 'SENT' && <button onClick={() => resend.mutate(d.id)} disabled={resend.isPending} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50">Gửi lại</button>}
              </li>
            )
          })}
        </ul>
      )}
      {q.hasNextPage && <button onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage} className="mt-2 w-full rounded-lg border border-slate-300 py-1.5 text-sm hover:bg-slate-50">{q.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}</button>}
    </section>
  )
}
