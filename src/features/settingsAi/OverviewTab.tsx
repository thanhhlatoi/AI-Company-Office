import { ArrowRight, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AiStatus, Health, SettingsAi } from '../../types/settingsAi'
import { timeAgo } from '../../lib/time'
import { describeError } from './errors'
import { routeText } from './routeText'
import { useAiStatus } from './hooks'
import { StatusDot } from './StatusDot'

type TabId = 'ollama' | 'omniroute' | 'hermes'
const UNKNOWN: Health = { state: 'unknown', checkedAt: '' }

function Node({ name, health, dim, note }: { name: string; health?: Health; dim?: boolean; note?: string }) {
  return (
    <div className={`min-w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm ${dim ? 'opacity-50' : ''}`}>
      <div className="font-semibold">{name}</div>
      {health && <StatusDot state={health.state} />}
      {note && <div className="text-xs text-slate-600">{note}</div>}
    </div>
  )
}
const Arrow = () => <ArrowRight size={18} className="shrink-0 rotate-90 text-slate-500 sm:rotate-0" aria-hidden />

function Card({ title, addr, h, onTry, children }: { title: string; addr: string; h: Health; onTry?: () => void; children?: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-1 rounded-card border border-slate-200 bg-white p-3 text-sm">
      <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{title}</h3><StatusDot state={h.state} /></div>
      <p className="break-all text-slate-700">{addr}</p>
      <p className="text-xs text-slate-600">
        {h.latencyMs !== undefined ? `${h.latencyMs} ms` : 'Chưa có độ trễ'} · {h.checkedAt ? `kiểm ${timeAgo(h.checkedAt)}` : 'chưa kiểm'}
        {h.detail ? ` · ${h.detail}` : ''}
      </p>
      {children}
      {onTry && <button onClick={onTry} className="mt-1 rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50">Thử</button>}
    </section>
  )
}

export function OverviewTab({ s, goTab }: { s: SettingsAi; goTab: (t: TabId) => void }) {
  const q = useAiStatus() // chỉ gắn khi tab này đang hiện; không refetch khi tab trình duyệt ẩn
  const st: AiStatus | undefined = q.data
  const err = q.isError ? describeError(q.error) : null
  const via = s.llm.viaOmniroute && s.llm.provider !== 'fake'
  const h = (k: keyof AiStatus) => st?.[k] ?? UNKNOWN
  const hermesOk = s.hermes.healthy
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm"><strong>Đường AI đang dùng:</strong> {routeText(s.llm)}</p>
        <button onClick={() => void q.refetch()} disabled={q.isFetching} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60">
          <RefreshCw size={14} className={q.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden />{q.isFetching ? 'Đang kiểm…' : 'Kiểm tra lại'}
        </button>
      </div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không kiểm tra được trạng thái: {err.message}{err.requestId ? ` (mã tra log: ${err.requestId})` : ''}</p>}

      <div className="space-y-3 rounded-card border border-slate-200 bg-slate-50 p-4" aria-label="Sơ đồ đường đi của AI" role="group">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap">
          <Node name="Frontend" /><Arrow /><Node name="BE" /><Arrow />
          <Node name="OmniRoute" health={h('omniroute')} dim={!via} note={via ? undefined : 'không dùng'} /><Arrow />
          <div className="flex flex-col gap-2"><Node name="Ollama (local)" health={h('ollama')} /><Node name="AI cloud" dim={!via} note="dự phòng, cấu hình trong OmniRoute" /></div>
        </div>
        {!via && s.llm.provider !== 'fake' && <p className="text-xs text-slate-600">OmniRoute đang tắt: BE gọi thẳng Ollama.</p>}
        <div className="flex flex-col items-center gap-2 border-t border-slate-200 pt-3 sm:flex-row">
          <Node name="BE" /><Arrow /><Node name="Hermes" health={h('hermes')} note="đường riêng, không qua OmniRoute" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Ollama" addr={s.ollama.baseUrl} h={h('ollama')} onTry={() => goTab('ollama')} />
        <Card title="OmniRoute" addr={s.omniroute.enabled ? s.omniroute.baseUrl : `${s.omniroute.baseUrl} (đang tắt)`} h={h('omniroute')} onTry={() => goTab('omniroute')} />
        <Card title="AI đang dùng (LLM)" addr={`${s.llm.provider === 'fake' ? 'AI giả' : s.llm.baseUrl} · model ${s.llm.model}`} h={h('llm')} onTry={() => goTab('ollama')} />
        <Card title="Hermes" addr={s.hermes.baseUrl} h={h('hermes')} onTry={() => goTab('hermes')}>
          <ul className="text-xs text-slate-700">
            <li>Trạng thái: {s.hermes.enabled ? 'đang bật' : 'đang tắt'}</li>
            <li>Planner: {s.hermes.planner}</li>
            <li>Khoẻ: {hermesOk === null ? 'chưa rõ' : hermesOk ? 'có' : 'không'}</li>
            <li>Quyền admin bot: {s.hermes.adminConfigured ? 'đã cấu hình' : 'chưa cấu hình'}</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
