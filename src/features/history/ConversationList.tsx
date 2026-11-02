import { useEffect, useRef } from 'react'
import { Avatar } from '../../components/Avatar'
import { ErrorBanner } from '../../components/ErrorBanner'
import { timeAgo } from '../../lib/time'
import { useMoney } from '../../lib/useMoney'
import { useAgentStore } from '../../store/agentStore'
import type { Conversation } from '../../types/history'
import { useHistoryFilters } from './filters'
import { Hl } from './highlight'
import { useConversations } from './hooks'

function Row({ c, q, active, onOpen }: { c: Conversation; q: string; active: boolean; onOpen: () => void }) {
  const agent = useAgentStore((s) => s.agentsById[c.agentId])
  const money = useMoney()
  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_104px]">
      <button onClick={onOpen} aria-current={active ? 'true' : undefined} className={`block w-full rounded-card border p-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand ${active ? 'border-brand bg-brand/5' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-start gap-2"><span className="min-w-0 flex-1 font-semibold"><Hl text={c.title} q={q} /></span>{c.hasError && <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">Có lỗi</span>}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600"><Avatar name={agent?.name ?? '?'} color={agent?.color ?? '#94a3b8'} size={16} />{agent?.name ?? `Agent ${c.agentId}`}<span>·</span><time>{timeAgo(c.updatedAt)}</time><span>·</span>{c.messageCount} tin<span>·</span><span className="tabular-nums">{c.tokens.toLocaleString('vi-VN')} token · {money(c.costMicro)}</span></div>
        {c.snippet && <p className="mt-1 line-clamp-2 text-xs text-slate-700"><Hl text={c.snippet} q={q} /></p>}
      </button>
    </li>
  )
}

/** Kết quả tìm kiếm: cuộn vô hạn theo cursor, có đang tải / rỗng / lỗi. */
export function ConversationList() {
  const f = useHistoryFilters()
  const q = useConversations(f.api)
  const sentinel = useRef<HTMLDivElement>(null)
  const items = q.data?.pages.flatMap((p) => p.items) ?? []
  useEffect(() => {
    const el = sentinel.current
    if (!el || !q.hasNextPage) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !q.isFetchingNextPage) void q.fetchNextPage() })
    io.observe(el)
    return () => io.disconnect()
  }, [q])
  return (
    <div className="space-y-2" aria-busy={q.isLoading}>
      {q.isError && <ErrorBanner message="Không tải được kết quả." onRetry={() => void q.refetch()} />}
      {q.isLoading && [0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-card bg-slate-200" />)}
      {!q.isLoading && !q.isError && items.length === 0 && <p className="rounded-card border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">Không có hội thoại nào khớp. Thử gõ không dấu hoặc bỏ bớt bộ lọc.</p>}
      {items.length > 0 && <p className="px-1 text-xs text-slate-600" role="status">{items.length}{q.hasNextPage ? '+' : ''} hội thoại · {f.sort === 'relevance' ? 'liên quan nhất trước' : 'mới nhất trước'}</p>}
      <ul className="space-y-2">{items.map((c) => <Row key={c.id} c={c} q={f.q} active={c.id === f.selected} onOpen={() => f.set({ c: c.id }, false)} />)}</ul>
      <div ref={sentinel} className="h-1" />
      {q.isFetchingNextPage && <div className="h-20 animate-pulse rounded-card bg-slate-200" />}
      {q.hasNextPage && !q.isFetchingNextPage && <button onClick={() => void q.fetchNextPage()} className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm hover:bg-slate-50">Tải thêm</button>}
    </div>
  )
}
