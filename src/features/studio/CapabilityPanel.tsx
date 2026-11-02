import { Ban, ShieldAlert } from 'lucide-react'
import { RiskChip } from '../../components/studio/badges'
import { DataClassBadge } from '../../components/studio/badges'
import type { Agent } from '../../types'
import type { EffectivePermissions } from '../../types/tools'
import { TRIANGLE_TEXT, hasRiskTriangle, riskRank } from './risk'
import { useEffective, useModelPolicy, useModelProfiles, useTools } from './queries'

/** Cột phải: "Agent này làm được gì" — tóm tắt quyền hiệu lực (BE tính), cập nhật khi chỉnh. `preview` = bản thay đổi chưa lưu. */
export function CapabilityPanel({ agent, preview }: { agent: Agent; preview?: EffectivePermissions }) {
  const live = useEffective(agent.id), tools = useTools().data ?? [], policy = useModelPolicy(agent.id).data, models = useModelProfiles().data ?? []
  const eff = preview ?? live.data
  const name = (id: string) => tools.find((t) => t.id === id)?.name ?? id
  const mine = [...(eff?.tools ?? [])].sort((a, b) => riskRank(b.risk) - riskRank(a.risk))
  const model = models.find((m) => m.id === policy?.resolved.modelId)
  return (
    <aside aria-label="Agent này làm được gì" className="space-y-3 text-sm">
      <h2 className="text-base font-semibold">Agent này làm được gì{preview && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs font-medium text-amber-950">xem trước</span>}</h2>
      {live.isLoading && <div className="h-24 animate-pulse rounded-card bg-slate-200" />}
      {live.isError && <p role="alert" className="rounded-lg bg-red-50 p-2 text-red-800">Không tải được quyền. <button className="underline" onClick={() => void live.refetch()}>Thử lại</button></p>}
      {eff && hasRiskTriangle(eff) && <p role="alert" className="flex gap-2 rounded-lg border border-orange-300 bg-orange-50 p-2 text-orange-950"><ShieldAlert size={18} className="shrink-0" aria-hidden /><span><b>Tam giác rủi ro.</b> {TRIANGLE_TEXT}</span></p>}
      {eff && mine.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-slate-700">Chưa có công cụ nào: agent chỉ trả lời bằng chữ, không tự làm gì bên ngoài.</p>}
      <ul className="space-y-2">
        {mine.map((t) => (
          <li key={t.toolId} className={`rounded-lg border p-2 ${t.allowed ? 'border-slate-200' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex flex-wrap items-center gap-1.5"><b className={t.allowed ? '' : 'text-slate-700 line-through'}>{name(t.toolId)}</b><RiskChip risk={t.risk} />{t.allowed && t.needsApproval && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">Cần duyệt</span>}</div>
            {t.scopeSummary && <p className="mt-0.5 break-words text-xs text-slate-700">{t.scopeSummary}</p>}
            {!t.allowed && <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-red-800"><Ban size={12} aria-hidden /> Đã cấp nhưng đang bị chặn: {t.blockedReason}</p>}
          </li>
        ))}
      </ul>
      <section aria-label="Model" className="space-y-1 border-t border-slate-200 pt-2">
        <h3 className="font-semibold">Model</h3>
        {model ? <p className="flex flex-wrap items-center gap-1.5">{model.label}<DataClassBadge value={model.dataClass} /></p> : policy ? <p className="font-semibold text-red-800">Không có model hợp lệ</p> : <div className="h-5 animate-pulse rounded bg-slate-200" />}
      </section>
    </aside>
  )
}
