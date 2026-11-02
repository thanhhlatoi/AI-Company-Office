import { ShieldAlert } from 'lucide-react'
import { DataClassBadge, RiskChip } from '../../../components/studio/badges'
import type { Collection } from '../../../types/knowledge'
import type { ModelProfile } from '../../../types/models'
import type { Secret, Tool } from '../../../types/tools'
import { ACCESS_LABEL } from '../../knowledge/access'
import { PRIVACY_INFO } from '../../studio/modelRules'
import { TRIANGLE_TEXT, hasRiskTriangle, isHighRisk } from '../../studio/risk'
import { fieldsOf } from '../../studio/schemaForm'
import type { Draft } from '../wizardLogic'

const show = (v: unknown) => (Array.isArray(v) ? v.join(', ') : String(v))
/** Tóm tắt "Agent sẽ có thể…" tính ngay trên trình duyệt từ các lựa chọn hiện tại (BE tính lại khi tạo). */
export function Summary({ d, tools, models, cols, secrets }: { d: Draft; tools: Tool[]; models: ModelProfile[]; cols: Collection[]; secrets: Secret[] }) {
  const on = Object.entries(d.picks).filter(([, p]) => p.on).map(([id, p]) => ({ tool: tools.find((t) => t.id === id), p })).filter((x): x is { tool: Tool; p: Draft['picks'][string] } => !!x.tool)
  const model = models.find((m) => m.id === d.primaryId)
  const readable = cols.filter((c) => (d.collections[c.id] ?? 'NONE') !== 'NONE')
  const flags = { privateData: on.some((x) => x.tool.readsPrivate) || readable.length > 0 || d.memory.enabled, readsExternal: on.some((x) => x.tool.readsExternal), sendsOut: on.some((x) => x.tool.sendsOut) }
  return (
    <aside aria-label="Agent sẽ có thể" className="space-y-3 text-sm">
      <h2 className="text-base font-semibold">Agent sẽ có thể…</h2>
      {hasRiskTriangle(flags) && <p role="alert" className="flex gap-2 rounded-lg border border-orange-300 bg-orange-50 p-2 text-orange-950"><ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden /><span><b>Tam giác rủi ro.</b> {TRIANGLE_TEXT}</span></p>}
      {on.length === 0 ? <p className="rounded-lg bg-slate-50 p-2 text-slate-700">Chưa có công cụ nào: chỉ trả lời bằng chữ.</p> : (
        <ul className="space-y-1.5">{on.map(({ tool, p }) => (
          <li key={tool.id} className="rounded-lg border border-slate-200 p-2"><span className="flex flex-wrap items-center gap-1.5"><b>{tool.name}</b><RiskChip risk={tool.risk} />{(p.alwaysApprove || isHighRisk(tool.risk)) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">Cần duyệt</span>}</span>
            <span className="mt-0.5 block break-words text-xs text-slate-700">{fieldsOf(tool.scopeSchema).filter((f) => f.kind !== 'json' && p.scope[f.key] != null && p.scope[f.key] !== '' && !(Array.isArray(p.scope[f.key]) && !(p.scope[f.key] as unknown[]).length)).map((f) => `${f.title}: ${f.kind === 'secret' ? secrets.find((x) => x.id === p.scope[f.key])?.name ?? 'chưa chọn' : show(p.scope[f.key])}`).join(' · ') || 'Phạm vi trống'}</span></li>))}</ul>
      )}
      <section aria-label="Model"><h3 className="font-semibold">Model</h3>{model ? <p className="flex flex-wrap items-center gap-1.5">{model.label}<DataClassBadge value={model.dataClass} /><span className="text-xs text-slate-700">({PRIVACY_INFO[d.privacy].label})</span></p> : <p className="text-red-800">Chưa chọn model</p>}</section>
      <section aria-label="Dữ liệu"><h3 className="font-semibold">Dữ liệu</h3>
        {readable.length === 0 && !d.memory.enabled ? <p className="text-slate-700">Không đọc kho tài liệu, không có bộ nhớ.</p> : <ul className="list-disc pl-5">{readable.map((c) => <li key={c.id}>{c.name}: {ACCESS_LABEL[d.collections[c.id]]}</li>)}{d.memory.enabled && <li>Có bộ nhớ riêng{d.memory.requireReview ? ' (ghi mới phải được bạn xem xét)' : ''}</li>}</ul>}
        {d.budgetUsd.trim() && <p className="mt-1">Ngân sách ngày: <b>${d.budgetUsd}</b></p>}</section>
    </aside>
  )
}
