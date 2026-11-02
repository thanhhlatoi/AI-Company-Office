import { Link } from 'react-router-dom'
import { timeAgo } from '../../lib/time'
import { useMoney } from '../../lib/useMoney'
import { useConversations } from './hooks'

/** Tab "Hội thoại" trong panel agent: hội thoại gần đây của agent; bấm để mở trong trang Lịch sử. */
export function AgentConversations({ agentId }: { agentId: string }) {
  const q = useConversations({ agentId, sort: 'newest' })
  const money = useMoney()
  const items = q.data?.pages[0]?.items ?? []
  if (q.isLoading) return <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}</div>
  if (q.isError) return <p role="alert" className="text-sm text-red-600">Không tải được hội thoại. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
  if (!items.length) return <p className="text-sm text-slate-600">Agent này chưa có hội thoại nào.</p>
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">{items.map((c) => (
        <li key={c.id}><Link to={`/history?c=${c.id}`} className="block rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50">
          <span className="flex items-center gap-1 font-medium">{c.title}{c.hasError && <span className="rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-800">lỗi</span>}</span>
          <span className="block text-xs text-slate-600">{timeAgo(c.updatedAt)} · {c.messageCount} tin · <span className="tabular-nums">{money(c.costMicro)}</span></span></Link></li>))}
      </ul>
      <Link to={`/history?agent=${agentId}`} className="block text-center text-sm text-brand underline">Mở tất cả trong Lịch sử{q.hasNextPage ? ' (còn nữa)' : ''}</Link>
    </div>
  )
}
