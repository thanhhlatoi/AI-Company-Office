import { TriangleAlert } from 'lucide-react'
import { NOTIFY_STYLE } from '../../../components/notifyStyle'
import { useAgentStore } from '../../../store/agentStore'
import type { NotificationSettings, NotifyLevel, Rule } from '../../../types/notify'
import { useProjects } from '../../projects/hooks'
import { NOTIFY_TYPES } from '../rules'
import { useSaveSettings } from './hooks'

type Channel = keyof Rule['channels']
const CHANNELS: [Channel, string][] = [['app', 'App'], ['telegram', 'Telegram'], ['email', 'Email']]
const SELECT = 'max-w-[9rem] rounded-lg border border-slate-300 px-2 py-1 text-sm'

/** Mỗi dòng một loại sự kiện: công tắc theo kênh, mức tối thiểu, bộ lọc dự án / agent. Mặc định lấy từ backend. */
export function RulesTable({ settings }: { settings: NotificationSettings }) {
  const save = useSaveSettings()
  const projects = useProjects({}).data ?? []
  const agents = Object.values(useAgentStore((s) => s.agentsById)).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const ready: Record<Channel, boolean> = { app: true, telegram: settings.telegram.status === 'VERIFIED', email: settings.email.status === 'VERIFIED' }
  const change = (type: string, patch: Partial<Rule>) => save.mutate({ rules: settings.rules.map((r) => (r.type === type ? { ...r, ...patch } : r)) })

  return (
    <section aria-labelledby="rules" className="rounded-card border border-slate-300 bg-white p-4">
      <h2 id="rules" className="text-lg font-semibold">Quy tắc thông báo</h2>
      <p className="mt-1 text-sm text-slate-600">Chọn kênh nhận cho từng loại sự kiện. Kênh chưa kết nối thì công tắc bị khoá.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-600">
            <th className="py-2 pr-2 font-semibold">Sự kiện</th>
            {CHANNELS.map(([, l]) => <th key={l} className="px-2 py-2 text-center font-semibold">{l}</th>)}
            <th className="px-2 py-2 font-semibold">Mức tối thiểu</th><th className="px-2 py-2 font-semibold">Chỉ với dự án / agent</th>
          </tr></thead>
          <tbody>
            {NOTIFY_TYPES.map(({ type, label }) => {
              const r = settings.rules.find((x) => x.type === type)
              if (!r) return null
              return (
                <tr key={type} className="border-b border-slate-100 align-top">
                  <th scope="row" className="py-2 pr-2 font-medium">{label}</th>
                  {CHANNELS.map(([ch, name]) => (
                    <td key={ch} className="px-2 py-2 text-center">
                      <input type="checkbox" role="switch" aria-label={`${label} qua ${name}`} checked={r.channels[ch]} disabled={!ready[ch]} title={ready[ch] ? undefined : `${name} chưa kết nối`}
                        onChange={(e) => change(type, { channels: { ...r.channels, [ch]: e.target.checked } })} className="size-4" />
                      {type === 'task.done' && ch === 'telegram' && r.channels.telegram && (
                        <p className="mx-auto mt-1 flex max-w-[11rem] items-start gap-1 text-left text-xs text-amber-800"><TriangleAlert size={12} className="mt-0.5 shrink-0" aria-hidden="true" />Có thể rất nhiều tin; nên bật tóm tắt cuối ngày.</p>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <select aria-label={`Mức tối thiểu của ${label}`} value={r.minLevel} onChange={(e) => change(type, { minLevel: e.target.value as NotifyLevel })} className={SELECT}>
                      {(Object.keys(NOTIFY_STYLE) as NotifyLevel[]).map((l) => <option key={l} value={l}>{NOTIFY_STYLE[l].label}</option>)}
                    </select>
                  </td>
                  <td className="space-y-1 px-2 py-2">
                    <select aria-label={`Lọc dự án của ${label}`} value={r.projectId ?? ''} onChange={(e) => change(type, { projectId: e.target.value || null })} className={`${SELECT} block`}>
                      <option value="">Mọi dự án</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select aria-label={`Lọc agent của ${label}`} value={r.agentId ?? ''} onChange={(e) => change(type, { agentId: e.target.value || null })} className={`${SELECT} block`}>
                      <option value="">Mọi agent</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
