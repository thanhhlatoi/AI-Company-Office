import type { LlmModel } from '../../types/gateway'
import { timeAgo } from '../../lib/time'
import type { ProviderRow } from './knownProviders'
import { CloudLocalBadge } from './CloudLocalBadge'
import { formatTokens } from './modelInfo'
import { summarize } from './modelStats'
import { providerInitials, providerName, providerPlan } from './providerNames'

const COLORS = ['bg-indigo-100 text-indigo-900', 'bg-rose-100 text-rose-900', 'bg-amber-100 text-amber-900', 'bg-teal-100 text-teal-900', 'bg-violet-100 text-violet-900', 'bg-cyan-100 text-cyan-900']
const colorOf = (alias: string) => COLORS[[...alias].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
const shortId = (id: string) => id.slice(id.indexOf('/') + 1)

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center"><div className="text-sm font-semibold">{value}</div><div className="text-[11px] text-slate-600">{label}</div></div>
}

/** Thẻ một nhà cung cấp: tên, cách dùng, số liệu tổng hợp, vài model tiêu biểu. models=undefined khi chưa tải xong. */
export function ProviderCard({ row, models, selected, onSelect, onForget }: { row: ProviderRow; models?: LlmModel[]; selected: boolean; onSelect: () => void; onForget: () => void }) {
  const st = models ? summarize(models) : null, plan = providerPlan(row.name)
  return (
    <li className={`flex flex-col gap-3 rounded-card border p-4 ${row.active ? (selected ? 'border-brand bg-white ring-1 ring-brand' : 'border-slate-200 bg-white') : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${row.active ? colorOf(row.name) : 'bg-slate-300 text-slate-700'}`}>{providerInitials(row.name)}</span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{providerName(row.name)}</h2>
          <p className="font-mono text-xs text-slate-600">{row.name}/</p>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1"><CloudLocalBadge provider={row.name} />
          <span className={`flex items-center gap-1 text-xs ${row.active ? 'text-green-800' : 'text-slate-600'}`}><span aria-hidden className={`h-2 w-2 rounded-full ${row.active ? 'bg-green-600' : 'bg-slate-400'}`} />{row.active ? 'Hoạt động' : 'Không hoạt động'}</span></span>
      </div>
      {plan && <p className="text-xs text-slate-700">{plan}</p>}
      {row.active ? (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Model" value={row.modelCount} />
            <Stat label="Nhận ảnh" value={st ? st.vision : '…'} />
            <Stat label="Suy luận" value={st ? st.reasoning : '…'} />
            <Stat label="Ngữ cảnh max" value={st ? formatTokens(st.maxContext) : '…'} />
          </div>
          {models && models.length > 0 && <p className="flex flex-wrap gap-1 text-[11px]">{models.slice(0, 3).map((m) => <span key={m.id} className="max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono">{shortId(m.id)}</span>)}{models.length > 3 && <span className="px-1 py-0.5 text-slate-600">+{models.length - 3}</span>}</p>}
          <button aria-pressed={selected} onClick={onSelect} className="mt-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 aria-pressed:border-brand aria-pressed:bg-brand/10 aria-pressed:font-semibold">{selected ? 'Đang xem chi tiết →' : 'Xem chi tiết model'}</button>
        </>
      ) : (
        <>
          <p className="text-xs">{row.modelCount} model · thấy lần cuối {timeAgo(row.lastSeen)}. Nhà cung cấp này không còn trả lời qua 9Router.</p>
          <button onClick={onForget} className="mt-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-white">Bỏ khỏi danh sách</button>
        </>
      )}
    </li>
  )
}
