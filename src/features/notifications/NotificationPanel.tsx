import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBanner } from '../../components/ErrorBanner'
import { NOTIFY_STYLE } from '../../components/notifyStyle'
import { PANEL_CLASS } from '../../components/panelStyles'
import { formatDateTime, timeAgo } from '../../lib/time'
import { useUiStore } from '../../store/uiStore'
import type { Notification, NotifyLevel } from '../../types/notify'
import { useMarkRead, useNotifications, useReadAll, useUnreadCount } from './hooks'
import { NOTIFY_TYPES } from './rules'
import { goToTarget } from './target'

const SELECT = 'rounded-lg border border-slate-300 px-2 py-1 text-sm'

function Item({ n }: { n: Notification }) {
  const mark = useMarkRead()
  const { Icon, label, text } = NOTIFY_STYLE[n.level]
  const open = () => { if (!n.readAt) mark.mutate(n.id); if (n.target) { goToTarget(n.target); useUiStore.getState().closeNotifs() } }
  return (
    <li className={`rounded-card border bg-white p-3 ${n.readAt ? 'border-slate-200' : 'border-brand/40 shadow-card'}`}>
      <div className="flex items-start gap-2">
        <Icon size={18} className={`mt-0.5 shrink-0 ${text}`} aria-hidden="true" />
        <button onClick={open} className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-brand">
          <span className="sr-only">{label}: </span>
          <span className={`block text-sm ${n.readAt ? '' : 'font-semibold'}`}>{n.title}</span>
          {n.body && <span className="mt-0.5 block text-xs text-slate-600">{n.body}</span>}
          <time className="mt-1 block text-xs text-slate-600" title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</time>
        </button>
        {!n.readAt && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand" role="img" aria-label="Chưa đọc" />}
      </div>
      {!n.readAt && <button onClick={() => mark.mutate(n.id)} className="ml-7 mt-1 text-xs text-brand underline">Đánh dấu đã đọc</button>}
    </li>
  )
}

/** Ngăn phải "Thông báo": chưa đọc ở trên, lọc theo mức/loại, đọc tất cả, cuộn vô hạn theo cursor. */
export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [level, setLevel] = useState('')
  const [type, setType] = useState('')
  const q = useNotifications({ level: level || undefined, type: type || undefined })
  const unread = useUnreadCount().data ?? 0
  const readAll = useReadAll()
  const root = useRef<HTMLElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data])
  const fresh = items.filter((n) => !n.readAt), old = items.filter((n) => n.readAt)

  useEffect(() => { root.current?.focus() }, [])
  useEffect(() => { // chạm đáy danh sách thì tải trang kế
    const el = sentinel.current
    if (!el || !q.hasNextPage) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !q.isFetchingNextPage) void q.fetchNextPage() })
    io.observe(el)
    return () => io.disconnect()
  }, [q])

  return (
    <aside ref={root} tabIndex={-1} aria-label="Thông báo" className={`${PANEL_CLASS} outline-none`}>
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <h2 className="flex-1 text-base font-semibold">Thông báo{unread > 0 && <span className="ml-2 rounded-full bg-brand px-2 text-xs font-bold text-white">{unread}</span>}</h2>
        <Link to="/settings/notifications" onClick={onClose} className="text-xs text-brand underline">Cài đặt</Link>
        <button aria-label="Đóng thông báo" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={18} /></button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2">
        <select aria-label="Lọc theo mức" value={level} onChange={(e) => setLevel(e.target.value)} className={SELECT}>
          <option value="">Mọi mức</option>
          {(Object.keys(NOTIFY_STYLE) as NotifyLevel[]).map((l) => <option key={l} value={l}>{NOTIFY_STYLE[l].label}</option>)}
        </select>
        <select aria-label="Lọc theo loại" value={type} onChange={(e) => setType(e.target.value)} className={SELECT}>
          <option value="">Mọi loại</option>
          {NOTIFY_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>
        <button onClick={() => readAll.mutate()} disabled={unread === 0 || readAll.isPending} className="ml-auto rounded-lg border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-50 disabled:opacity-40">Đọc tất cả</button>
      </div>
      {q.isError && <ErrorBanner message="Không tải được thông báo." onRetry={() => void q.refetch()} />}
      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-3" aria-busy={q.isLoading}>
        {q.isLoading && [0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-card bg-slate-200" />)}
        {!q.isLoading && items.length === 0 && <p className="py-10 text-center text-sm text-slate-600">Không có thông báo nào{level || type ? ' khớp bộ lọc' : ''}.</p>}
        {fresh.length > 0 && <section aria-label="Chưa đọc"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Chưa đọc ({fresh.length})</h3><ul className="space-y-2">{fresh.map((n) => <Item key={n.id} n={n} />)}</ul></section>}
        {old.length > 0 && <section aria-label="Đã đọc"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Đã đọc</h3><ul className="space-y-2">{old.map((n) => <Item key={n.id} n={n} />)}</ul></section>}
        <div ref={sentinel} className="h-1" />
        {q.isFetchingNextPage && <div className="h-12 animate-pulse rounded-card bg-slate-200" />}
        {q.hasNextPage && !q.isFetchingNextPage && <button onClick={() => void q.fetchNextPage()} className="w-full rounded-lg border border-slate-300 py-2 text-sm hover:bg-white">Tải thêm</button>}
      </div>
    </aside>
  )
}
