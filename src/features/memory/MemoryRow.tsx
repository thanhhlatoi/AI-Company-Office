import { BookOpen, CalendarClock, Heart, ListChecks, Pin, PinOff, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { formatDateTime, timeAgo } from '../../lib/time'
import { useAgentStore } from '../../store/agentStore'
import type { MemoryItem } from '../../types/memory'
import { Hl } from '../history/highlight'
import { OriginBadge } from './OriginBadge'
import { KIND_LABEL, STATUS_LABEL } from './style'
import { useMemoryActions } from './mutations'

const KIND_ICON = { FACT: BookOpen, PREFERENCE: Heart, EVENT: CalendarClock, PROCEDURE: ListChecks } as const

/** Một mục bộ nhớ: nội dung (chữ thường, không HTML), chủ thể, độ quan trọng, nguồn gốc, độ tin cậy, ngày; ghim / sửa / xoá. */
export function MemoryRow({ m, q }: { m: MemoryItem; q: string }) {
  const act = useMemoryActions(), agent = useAgentStore((s) => (m.agentId ? s.agentsById[m.agentId] : undefined))
  const [editing, setEditing] = useState(false), [text, setText] = useState(m.content), [del, setDel] = useState(false)
  const Icon = KIND_ICON[m.kind]
  return (
    <li style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 110px' }} className={`rounded-card border bg-white p-3 text-sm ${m.status === 'PENDING_REVIEW' ? 'border-orange-300' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Icon size={15} className="text-slate-700" aria-label={KIND_LABEL[m.kind]} />
        <OriginBadge origin={m.origin} />
        {m.status !== 'ACTIVE' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">{STATUS_LABEL[m.status]}</span>}
        {m.editedByOwner && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">Chủ đã sửa</span>}
        {m.pinned && <span className="text-xs font-semibold text-slate-800">📌 Đã ghim</span>}
        <span className="ml-auto flex gap-1">
          <button aria-label={m.pinned ? 'Bỏ ghim' : 'Ghim'} aria-pressed={m.pinned} title={m.pinned ? 'Bỏ ghim' : 'Ghim'} onClick={() => act.edit.mutate({ id: m.id, e: { pinned: !m.pinned } })} className="rounded border border-slate-300 p-1 hover:bg-slate-50">{m.pinned ? <PinOff size={14} /> : <Pin size={14} />}</button>
          <button onClick={() => { setText(m.content); setEditing((v) => !v) }} className="rounded border border-slate-300 px-2 text-xs hover:bg-slate-50">Sửa</button>
          <button aria-label="Xoá ký ức" onClick={() => setDel(true)} className="rounded border border-red-300 p-1 text-red-800 hover:bg-red-50"><Trash2 size={14} /></button></span>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2"><textarea aria-label="Nội dung ký ức" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-lg border border-slate-300 p-2" />
          <div className="flex gap-2"><button disabled={!text.trim() || act.edit.isPending} onClick={() => act.edit.mutate({ id: m.id, e: { content: text } }, { onSuccess: () => setEditing(false) })} className="rounded-lg bg-brand px-3 py-1 text-white disabled:opacity-50">Lưu</button><button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1 hover:bg-slate-100">Huỷ</button></div></div>
      ) : <p className="mt-1.5 break-words"><Hl text={m.content} q={q} /></p>}
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-700">
        {m.subject && <span>Chủ thể: <b>{m.subject}</b></span>}<span>Quan trọng {m.importance}/5</span><span>Tin cậy {Math.round(m.confidence * 100)}%</span>
        {agent && <span>Agent {agent.name}</span>}<span title={formatDateTime(m.createdAt)}>tạo {timeAgo(m.createdAt)}</span>
        <span>{m.lastAccessedAt ? `dùng gần nhất ${timeAgo(m.lastAccessedAt)}` : 'chưa được dùng'}</span>{m.expiresAt && <span>hết hạn {formatDateTime(m.expiresAt)}</span>}</p>
      {del && <TwoStepConfirm title="Xoá ký ức?" askReason={false} confirmLabel="Xoá" busy={act.remove.isPending} preview={<p className="text-sm break-words">Xoá vĩnh viễn: “{m.content}”. Agent sẽ không nhớ điều này nữa.</p>} onClose={() => setDel(false)} onConfirm={() => act.remove.mutate(m.id, { onSuccess: () => setDel(false) })} />}
    </li>
  )
}
