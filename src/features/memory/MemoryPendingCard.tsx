import { Link } from 'react-router-dom'
import { timeAgo } from '../../lib/time'
import { useMemory, usePendingMemory } from '../studio/queries'
import { OriginBadge } from './OriginBadge'

/** Trong hộp thư "Cần xử lý": tóm tắt ký ức chờ xem xét + đường tới trang Bộ nhớ (xem xét đầy đủ ở đó, kèm nguồn và cảnh báo). */
export function MemoryPendingCard({ onNavigate }: { onNavigate: () => void }) {
  const n = usePendingMemory().data ?? 0, q = useMemory({ status: 'PENDING_REVIEW' })
  const rows = (q.data?.pages[0]?.items ?? []).slice(0, 3)
  if (!n) return <p className="py-10 text-center text-base text-slate-600">Không có ký ức nào chờ xem xét.</p>
  return (
    <section aria-label="Ký ức chờ xem xét" className="space-y-3 rounded-card border border-orange-300 bg-white p-3 text-sm">
      <p><b>{n}</b> ký ức đang chờ bạn xem xét. Mục suy ra từ nội dung bên ngoài chỉ nên duyệt nếu đúng sự thật.</p>
      <ul className="space-y-2">{rows.map((m) => <li key={m.id} className="rounded-lg bg-slate-50 p-2"><div className="flex items-center gap-2"><OriginBadge origin={m.origin} /><span className="text-xs text-slate-700">{timeAgo(m.createdAt)}</span></div><p className="mt-1 break-words">{m.content}</p></li>)}</ul>
      <Link to="/memory?tab=review" onClick={onNavigate} className="inline-block rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark">Xem xét tại trang Bộ nhớ</Link>
    </section>
  )
}
