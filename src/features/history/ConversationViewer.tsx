import { ChevronDown, ChevronUp, Copy, Download, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listMessages } from '../../api/biz'
import { Avatar } from '../../components/Avatar'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Modal } from '../../components/Modal'
import { formatDateTime, formatDay } from '../../lib/time'
import { useMoney } from '../../lib/useMoney'
import { foldVi } from '../../lib/text'
import { useAgentStore } from '../../store/agentStore'
import { useUiStore } from '../../store/uiStore'
import type { Message } from '../../types/history'
import { ConversationMemory } from '../memory/ConversationMemory'
import { useProjects } from '../projects/hooks'
import { download, toJson, toMarkdown } from './exportConv'
import { useConversation, useMessages } from './hooks'
import { MessageItem } from './MessageItem'
import { useDeleteConversation } from './useDelete'

/** Mọi tin của hội thoại (đi hết các trang) để xuất / sao chép. */
async function fetchAll(id: string): Promise<Message[]> {
  const out: Message[] = []
  let cursor: string | undefined
  do { const p = await listMessages(id, cursor); out.push(...p.items); cursor = p.nextCursor ?? undefined } while (cursor)
  return out
}
const hay = (m: Message) => foldVi(`${m.content} ${m.toolName ?? ''} ${JSON.stringify(m.toolArgs ?? '')}`)

/** Trình xem hội thoại dạng chat. Nội dung là dữ liệu không tin cậy: luôn render đã làm sạch (SafeMarkdown). */
export function ConversationViewer({ id, q }: { id: string; q: string }) {
  const meta = useConversation(id), msgs = useMessages(id)
  const projects = useProjects({}).data
  const agent = useAgentStore((s) => (meta.data ? s.agentsById[meta.data.agentId] : undefined))
  const money = useMoney()
  const navigate = useNavigate()
  const del = useDeleteConversation()
  const [cur, setCur] = useState(0), [busy, setBusy] = useState(false), [confirming, setConfirming] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const c = meta.data
  const items = msgs.data?.pages.flatMap((p) => p.items) ?? []
  const n = foldVi(q.trim())
  const hitIds = n ? items.filter((m) => hay(m).includes(n)).map((m) => m.id) : []
  const target = hitIds[Math.min(cur, Math.max(0, hitIds.length - 1))]

  useEffect(() => { if (n && hitIds.length === 0 && msgs.hasNextPage && !msgs.isFetchingNextPage) void msgs.fetchNextPage() }, [n, hitIds.length, msgs]) // chưa thấy kết quả: tải thêm trang
  useEffect(() => { if (target) document.getElementById(`msg-${target}`)?.scrollIntoView({ block: 'center' }) }, [target]) // nhảy tới kết quả
  useEffect(() => {
    const el = end.current
    if (!el || !msgs.hasNextPage) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !msgs.isFetchingNextPage) void msgs.fetchNextPage() })
    io.observe(el)
    return () => io.disconnect()
  }, [msgs])

  const act = async (kind: 'copy' | 'md' | 'json') => {
    if (!c) return
    setBusy(true)
    try {
      const all = await fetchAll(id)
      const md = toMarkdown(c, agent?.name ?? c.agentId, all)
      if (kind === 'copy') { await navigator.clipboard.writeText(md); useUiStore.getState().toast('Đã sao chép hội thoại') }
      else download(`hoi-thoai-${id}.${kind === 'md' ? 'md' : 'json'}`, kind === 'md' ? 'text/markdown' : 'application/json', kind === 'md' ? md : toJson(c, all))
    } catch { useUiStore.getState().toast('Không xuất được hội thoại, thử lại', 'error') } finally { setBusy(false) }
  }
  if (meta.isError) return <div className="p-4"><ErrorBanner message="Không tải được hội thoại (có thể đã bị xoá)." onRetry={() => void meta.refetch()} /></div>
  if (!c) return <div className="space-y-3 p-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-card bg-slate-200" />)}</div>
  const btn = 'flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50 disabled:opacity-50'
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="space-y-2 border-b border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2"><h2 className="min-w-0 flex-1 text-lg font-bold">{c.title}</h2>{c.hasError && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">Có lỗi</span>}</div>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-600"><Avatar name={agent?.name ?? '?'} color={agent?.color ?? '#94a3b8'} size={18} /><Link to={`/agents/${c.agentId}`} className="underline">{agent?.name ?? `Agent ${c.agentId}`}</Link> · {formatDateTime(c.startedAt)} · {c.messageCount} tin · <span className="tabular-nums">{c.tokens.toLocaleString('vi-VN')} token · {money(c.costMicro)}</span></p>
        <p className="flex flex-wrap gap-x-3 text-xs">{c.taskId && <Link to={`/kanban?task=${c.taskId}`} className="text-brand underline">Task #{c.taskId}</Link>}{c.goalId && <Link to={`/goals/${c.goalId}`} className="text-brand underline">Mục tiêu</Link>}{c.projectId && <Link to={`/projects/${c.projectId}`} className="text-brand underline">Dự án {projects?.find((p) => p.id === c.projectId)?.name ?? c.projectId}</Link>}</p>
        <ConversationMemory id={id} />
        <div className="flex flex-wrap items-center gap-2">
          <button className={btn} disabled={busy} onClick={() => void act('copy')}><Copy size={14} aria-hidden="true" /> Sao chép</button>
          <button className={btn} disabled={busy} onClick={() => void act('md')}><Download size={14} aria-hidden="true" /> Xuất Markdown</button>
          <button className={btn} disabled={busy} onClick={() => void act('json')}><Download size={14} aria-hidden="true" /> Xuất JSON</button>
          <button className={`${btn} text-red-700`} onClick={() => setConfirming(true)}><Trash2 size={14} aria-hidden="true" /> Xoá hội thoại</button>
          {n && <span className="ml-auto flex items-center gap-1 text-sm" role="status">{hitIds.length ? `Khớp ở tin ${Math.min(cur, hitIds.length - 1) + 1}/${hitIds.length}` : msgs.hasNextPage ? 'Đang tìm tiếp…' : 'Không có tin nào khớp'}
            <button aria-label="Kết quả trước" disabled={hitIds.length < 2} onClick={() => setCur((cur - 1 + hitIds.length) % hitIds.length)} className="rounded border border-slate-300 p-1 disabled:opacity-40"><ChevronUp size={14} /></button>
            <button aria-label="Kết quả tiếp" disabled={hitIds.length < 2} onClick={() => setCur((cur + 1) % hitIds.length)} className="rounded border border-slate-300 p-1 disabled:opacity-40"><ChevronDown size={14} /></button></span>}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3 pb-24">
        {msgs.isError && <ErrorBanner message="Không tải được tin nhắn." onRetry={() => void msgs.refetch()} />}
        {msgs.isLoading && <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-card bg-slate-200" />)}</div>}
        {!msgs.isLoading && items.length === 0 && <p className="py-10 text-center text-sm text-slate-600">Hội thoại chưa có tin nhắn.</p>}
        <ol className="space-y-3" aria-label="Tin nhắn">
          {items.map((m, i) => {
            const day = formatDay(m.createdAt)
            return [
              i === 0 || day !== formatDay(items[i - 1].createdAt) ? <li key={`d-${m.id}`} role="separator" className="py-1 text-center text-xs font-semibold text-slate-600">{day}</li> : null,
              <MessageItem key={m.id} m={m} q={q} hit={hitIds.includes(m.id)} current={m.id === target} />,
            ]
          })}
        </ol>
        <div ref={end} className="h-1" />
        {msgs.isFetchingNextPage && <div className="mt-3 h-16 animate-pulse rounded-card bg-slate-200" />}
        {msgs.hasNextPage && !msgs.isFetchingNextPage && <button onClick={() => void msgs.fetchNextPage()} className="mt-3 w-full rounded-lg border border-slate-300 bg-white py-2 text-sm hover:bg-slate-50">Tải thêm tin nhắn ({items.length}/{c.messageCount})</button>}
      </div>
      {confirming && (
        <Modal title="Xoá hội thoại?" onClose={() => setConfirming(false)}>
          <p className="text-sm">Xoá <b>{c.title}</b> cùng toàn bộ tin nhắn? Không thể hoàn tác.</p>
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setConfirming(false)} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Giữ lại</button>
            <button disabled={del.isPending} onClick={() => del.mutate(id, { onSuccess: () => { setConfirming(false); navigate('/history') } })} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">{del.isPending ? 'Đang xoá…' : 'Xoá'}</button></div>
        </Modal>
      )}
    </div>
  )
}
