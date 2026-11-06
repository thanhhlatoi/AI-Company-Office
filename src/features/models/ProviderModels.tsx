import { X } from 'lucide-react'
import { useState } from 'react'
import { PANEL_CLASS } from '../../components/panelStyles'
import type { GatewayTest } from '../../types/gateway'
import { CloudLocalBadge } from './CloudLocalBadge'
import { useGatewayTest, useLlmModels } from './gatewayHooks'
import { formatTokens } from './modelInfo'
import { filterModels } from './modelStats'
import { providerName, providerPlan } from './providerNames'
import { YesNo } from './YesNo'

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded bg-slate-50 px-1 py-1"><div className="text-[10px] text-slate-600">{label}</div><div className="text-xs font-semibold">{children}</div></div>
}

/** Ngăn bên phải: chi tiết model của một nhà cung cấp (ngữ cảnh, ảnh, công cụ, suy luận), tìm kiếm, "Gọi thử" (tốn token thật). */
export function ProviderModels({ provider, onClose }: { provider: string; onClose: () => void }) {
  const models = useLlmModels(provider)
  const test = useGatewayTest()
  const [results, setResults] = useState<Record<string, GatewayTest>>({})
  const [q, setQ] = useState(''), [visionOnly, setVisionOnly] = useState(false)
  const testing = test.isPending ? test.variables : null
  const rows = filterModels(models.data ?? [], q, visionOnly)
  const plan = providerPlan(provider)
  return (
    <aside aria-label={`Chi tiết model của ${providerName(provider)}`} className={PANEL_CLASS.replace('lg:w-[380px]', 'lg:w-[460px]')}>
      <div className="space-y-2 border-b border-slate-200 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><h2 className="text-base font-semibold">{providerName(provider)}</h2><p className="font-mono text-xs text-slate-600">{provider}/</p></div>
          <div className="flex items-center gap-2"><CloudLocalBadge provider={provider} /><button aria-label="Đóng" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={18} /></button></div>
        </div>
        {plan && <p className="text-xs text-slate-700">{plan}</p>}
        <input aria-label="Tìm model" placeholder="Tìm model…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-1.5"><input type="checkbox" checked={visionOnly} onChange={(e) => setVisionOnly(e.target.checked)} />Chỉ model nhận ảnh</label><span className="text-slate-600">{rows.length}/{models.data?.length ?? 0} model</span></div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {models.isLoading && <div className="h-40 animate-pulse rounded-card bg-slate-200" aria-busy="true" />}
        {models.isError && <p role="alert" className="text-sm text-red-800">Không tải được model. <button className="underline" onClick={() => void models.refetch()}>Thử lại</button></p>}
        {models.data && rows.length === 0 && <p className="p-4 text-center text-sm text-slate-600">Không có model khớp bộ lọc.</p>}
        <ul className="space-y-2">
          {rows.map((m) => { const r = results[m.id]; return (
            <li key={m.id} className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="break-all font-mono text-xs font-medium">{m.id}</span>
                <button disabled={testing === m.id} onClick={() => test.mutate(m.id, { onSuccess: (x) => setResults((v) => ({ ...v, [m.id]: x })) })} className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50 disabled:opacity-50">{testing === m.id ? 'Đang gọi…' : 'Gọi thử'}</button>
              </div>
              <div className="grid grid-cols-5 gap-1 text-center">
                <Cell label="Ngữ cảnh">{formatTokens(m.contextWindow)}</Cell><Cell label="Ra tối đa">{formatTokens(m.maxOutput)}</Cell>
                <Cell label="Ảnh"><YesNo v={m.vision} /></Cell><Cell label="Công cụ"><YesNo v={m.tools} /></Cell><Cell label="Suy luận"><YesNo v={m.reasoning} /></Cell>
              </div>
              <p aria-live="polite" className="text-xs">{r && (r.ok ? <span className="text-green-800">Gọi được · {r.latencyMs} ms · {r.inputTokens}+{r.outputTokens} token</span> : <span className="text-red-800">Lỗi: {r.error}</span>)}</p>
            </li>) })}
        </ul>
        <p className="mt-3 text-[11px] text-slate-600">“Gọi thử” tốn token thật; BE ghi vào Chi phí (MODEL_TEST) và bị ngân sách chặn khi hết.</p>
      </div>
    </aside>
  )
}
