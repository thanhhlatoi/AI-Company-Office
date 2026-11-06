import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ApiError } from '../../api/http'
import { agentChannelAction, listAgentChannels, type ChannelAction } from '../../api/hermes'
import type { HermesChannel } from '../../types/hermes'
import { describeError } from '../settingsAi/errors'

const BTN = 'rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-50'
const rowKey = (c: Pick<HermesChannel, 'machine' | 'name'>) => `${c.machine}/${c.name}`

/** Mở/đóng Chrome của kênh YouTube qua plugin ytb của bot. Đi thẳng, không qua AI nên vài giây là xong. Không có đăng video. */
export function ChannelsTab({ agentId }: { agentId: string }) {
  const qc = useQueryClient()
  const key = ['hermes', 'channels', agentId] as const
  const q = useQuery({ queryKey: key, queryFn: () => listAgentChannels(agentId), retry: false })
  const [query, setQuery] = useState('')
  const act = useMutation({
    gcTime: 0,
    mutationFn: ({ channel, action }: { channel: HermesChannel; action: ChannelAction }) =>
      agentChannelAction(agentId, action, channel.name, channel.machine),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
  const channels = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (q.data?.channels ?? []).filter((c) => !needle || c.name.toLowerCase().includes(needle))
  }, [q.data, query])

  if (q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 409)) {
    return <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">Bot của agent này chưa điều khiển được kênh: {describeError(q.error).message}</p>
  }
  const pending = act.isPending ? rowKey(act.variables.channel) : null
  const error = q.error ?? act.error

  return (
    <section className="space-y-3 text-sm" aria-label="Kênh YouTube">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-3">
          {(q.data?.machines ?? []).map((m) => (
            <li key={m.key} title={m.error ?? undefined} className={m.online ? 'text-emerald-800' : 'text-red-800'}>{m.online ? '●' : '✖'} {m.label}{m.online ? '' : ' (tắt)'}</li>
          ))}
        </ul>
        <button onClick={() => void q.refetch()} disabled={q.isFetching} className={`${BTN} flex items-center gap-1`}>
          <RefreshCw size={12} className={q.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden />Tải lại
        </button>
      </div>
      <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-2 py-1">
        <Search size={14} aria-hidden />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kênh" aria-label="Tìm kênh" className="w-full bg-transparent focus:outline-none" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">⚠ {describeError(error).message}</p>}
      {q.isLoading && <p className="text-slate-600">Đang tải…</p>}
      {q.data && channels.length === 0 && <p className="text-slate-600">Không có kênh nào.</p>}
      <ul className="divide-y divide-slate-200">
        {channels.map((c) => {
          const running = c.status === 'RUNNING'
          const busy = pending === rowKey(c)
          return (
            <li key={rowKey(c)} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="text-xs text-slate-600">{c.machine} · {running ? 'đang mở' : 'đã đóng'}{c.imported ? ' · profile gốc' : ''}</span>
              </span>
              <button disabled={act.isPending} onClick={() => act.mutate({ channel: c, action: running ? 'close' : 'open' })} className={`${BTN} flex shrink-0 items-center gap-1`}>
                {busy && <LoaderCircle size={12} className="animate-spin motion-reduce:animate-none" aria-hidden />}
                {running ? 'Đóng Chrome' : 'Mở Chrome'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
