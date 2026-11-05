import { CircleAlert, CircleCheck, CircleDashed, CircleX, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { timeAgo } from '../../lib/time'
import type { HermesAgent } from '../../types/hermes'
import { describeError } from './errors'
import { hermesBanner, SYNC_LABEL } from './hermesLogic'
import { useHermesActions, useHermesAgents, useHermesStatus } from './hermesHooks'

const ICON = { SYNCED: CircleCheck, NOT_SYNCED: CircleDashed, MISSING: CircleAlert, ERROR: CircleX } as const
const TONE = { SYNCED: 'text-emerald-800', NOT_SYNCED: 'text-slate-700', MISSING: 'text-amber-800', ERROR: 'text-red-800' } as const
type Confirm = { kind: 'all' } | { kind: 'restart'; row: HermesAgent }

/** Đồng bộ bot AgentOffice ↔ Hermes. Cần BE thật (không có mock). Mọi nội dung từ BE hiện dạng văn bản thuần. */
export function HermesSync() {
  const st = useHermesStatus(true), list = useHermesAgents(true)
  const act = useHermesActions()
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const err = [st.error, list.error, act.all.error, act.one.error, act.restart.error].filter(Boolean).map(describeError)[0]
  const banner = st.data ? hermesBanner(st.data) : null
  const rows = list.data ?? []
  const refetch = () => { void st.refetch(); void list.refetch() }

  return (
    <section className="space-y-3 rounded-card border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Bot trên Hermes</h2>
        <div className="flex gap-2">
          <button onClick={refetch} disabled={st.isFetching || list.isFetching} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={st.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden />Kiểm tra lại</button>
          <button onClick={() => setConfirm({ kind: 'all' })} disabled={act.busy || !st.data?.reachable} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">Đồng bộ lại tất cả</button>
        </div>
      </div>

      {err && <p role="alert" className="text-sm text-red-800">⚠ {err.message}{err.requestId ? ` (mã tra log: ${err.requestId})` : ''}</p>}
      {st.isLoading && <div className="h-10 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" aria-busy="true" />}
      {banner && <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${banner.tone === 'error' ? 'border-red-300 bg-red-50 text-red-950' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>{banner.tone === 'error' ? '✖' : '⚠'} {banner.text}</p>}
      {st.data && !banner && <p className="text-sm text-emerald-900">✔ Hermes khớp với AgentOffice: {st.data.synced}/{st.data.agentsInOffice} agent có bot{st.data.detail ? ` · ${st.data.detail}` : ''}.</p>}
      {st.data && <p className="text-xs text-slate-600">Kiểm lúc {timeAgo(st.data.checkedAt)}. Hermes có {st.data.botsInHermes ?? '?'} bot.</p>}

      <div aria-live="polite" className="text-sm">
        {act.all.data && <p>Đã đồng bộ: tạo {act.all.data.created}, cập nhật {act.all.data.updated}, lỗi {act.all.data.failed.length}.{act.all.data.failed.length > 0 && <> Lỗi: {act.all.data.failed.map((f) => `#${f.agentId} (${f.error})`).join('; ')}</>}</p>}
      </div>

      {list.isLoading ? <div className="h-24 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" aria-busy="true" />
        : rows.length === 0 ? <p className="rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-700">Chưa có agent nào để đồng bộ.</p>
        : (
          <div className="overflow-x-auto rounded-card border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left"><tr>{['Agent', 'Trạng thái', 'Bot Hermes', 'Đồng bộ lần cuối', ''].map((h) => <th key={h} scope="col" className="p-2 font-semibold">{h || <span className="sr-only">Thao tác</span>}</th>)}</tr></thead>
              <tbody>{rows.map((r) => {
                const Icon = ICON[r.syncState]
                return (
                  <tr key={r.agentId} className="border-t border-slate-100 align-top">
                    <th scope="row" className="p-2 text-left font-medium">{r.name}</th>
                    <td className="p-2"><span className={`inline-flex items-center gap-1 ${TONE[r.syncState]}`}><Icon size={14} aria-hidden />{SYNC_LABEL[r.syncState]}</span>{r.error && <span className="block text-xs text-red-800">{r.error}</span>}</td>
                    <td className="p-2 font-mono text-xs">{r.hermesBotId ?? '—'}</td>
                    <td className="p-2 text-xs">{r.lastSyncedAt ? timeAgo(r.lastSyncedAt) : '—'}</td>
                    <td className="whitespace-nowrap p-2 text-right">
                      <button onClick={() => act.one.mutate(r.agentId)} disabled={act.busy} aria-label={`Đồng bộ bot của ${r.name}`} className="rounded-lg border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Đồng bộ</button>{' '}
                      {r.hermesBotId && r.syncState !== 'MISSING' && <button onClick={() => setConfirm({ kind: 'restart', row: r })} disabled={act.busy} aria-label={`Restart bot của ${r.name}`} className="rounded-lg border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Restart</button>}
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}

      {confirm?.kind === 'all' && (
        <TwoStepConfirm title="Đồng bộ lại tất cả bot" askReason={false} confirmLabel="Đồng bộ" busy={act.busy} onClose={() => setConfirm(null)} onConfirm={() => { act.all.mutate(undefined); setConfirm(null) }}
          preview={<ul className="list-disc space-y-1 pl-5"><li>BE sẽ tạo bot còn thiếu và cập nhật bot lệch trên Hermes cho {st.data?.agentsInOffice ?? rows.length} agent.</li><li>Có thể mất vài phút nếu Hermes vừa được dựng lại.</li><li>Bot thừa trong Hermes không bị xoá ở bước này.</li></ul>} />
      )}
      {confirm?.kind === 'restart' && (
        <TwoStepConfirm title={`Restart bot: ${confirm.row.name}`} askReason={false} confirmLabel="Restart" busy={act.busy} onClose={() => setConfirm(null)} onConfirm={() => { act.restart.mutate(confirm.row.agentId); setConfirm(null) }}
          preview={<p>Bot sẽ khởi động lại trên Hermes. Việc đang chạy của bot này có thể bị gián đoạn.</p>} />
      )}
    </section>
  )
}
