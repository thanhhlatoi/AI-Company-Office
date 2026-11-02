import { CircleAlert, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { SortableList } from '../../components/studio/SortableList'
import { DataClassBadge } from '../../components/studio/badges'
import { useDeviceStore } from '../../store/deviceStore'
import type { Agent } from '../../types'
import type { ModelPolicy, ModelPolicyInput, ModelProfile, PrivacyMode, RoutingMode } from '../../types/models'
import { ModelInfo } from './ModelInfo'
import { ModelTester } from './ModelTester'
import { PRIVACY_INFO, ROUTING_INFO, policyWarnings } from './modelRules'
import { useSavePolicy } from './mutations'
import { useEffective, useModelPolicy, useModelProfiles } from './queries'

const sel = 'w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm'
const toInput = (p: ModelPolicy): ModelPolicyInput => ({ primaryId: p.primaryId, fallbackIds: p.fallbackIds, escalationId: p.escalationId ?? null, routing: p.routing, privacy: p.privacy })

export function ModelTab({ agent }: { agent: Agent }) {
  const policy = useModelPolicy(agent.id), models = useModelProfiles(), eff = useEffective(agent.id)
  if (policy.isLoading || models.isLoading) return <div className="h-48 animate-pulse rounded-card bg-slate-200" />
  if (policy.isError || models.isError || !policy.data || !models.data) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được cấu hình model. <button className="underline" onClick={() => { void policy.refetch(); void models.refetch() }}>Thử lại</button></p>
  const hasTools = (eff.data?.tools ?? []).some((t) => t.allowed)
  return <Editor key={JSON.stringify(toInput(policy.data))} agent={agent} saved={policy.data} models={models.data} hasTools={hasTools} />
}

function Editor({ agent, saved, models, hasTools }: { agent: Agent; saved: ModelPolicy; models: ModelProfile[]; hasTools: boolean }) {
  const [d, setD] = useState<ModelPolicyInput>(toInput(saved))
  const save = useSavePolicy(agent.id)
  const devices = useDeviceStore((s) => s.devicesById)
  const byId = new Map(models.map((m) => [m.id, m]))
  const warnings = policyWarnings(d, models, hasTools, (id) => devices[id]?.status === 'OFFLINE')
  const dirty = JSON.stringify(d) !== JSON.stringify(toInput(saved))
  const blocked = warnings.some((w) => w.level === 'error')
  const addable = models.filter((m) => m.id !== d.primaryId && m.id !== d.escalationId && !d.fallbackIds.includes(m.id))
  const label = (m: ModelProfile) => `${m.label} — ${m.dataClass}`
  const chain = [...new Set([d.primaryId, ...d.fallbackIds, ...(d.escalationId ? [d.escalationId] : [])])]
  const rolesOf = (id: string) => (id === d.primaryId ? 'Chính' : id === d.escalationId ? 'Leo thang' : 'Dự phòng')
  const radios = <K extends string>(name: string, value: K, info: Record<K, { label: string; hint: string }>, on: (v: K) => void) => (
    <fieldset className="space-y-1"><legend className="mb-1 text-sm font-semibold">{name}</legend>
      {(Object.keys(info) as K[]).map((k) => (
        <label key={k} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${value === k ? 'border-brand bg-blue-50' : 'border-slate-200'}`}>
          <input type="radio" name={name} checked={value === k} onChange={() => on(k)} className="mt-1" /><span><b>{info[k].label}</b><span className="block text-xs text-slate-700">{info[k].hint}</span></span>
        </label>
      ))}
    </fieldset>
  )
  return (
    <div className="space-y-5">
      <section aria-label="Trạng thái model hiện tại" role="status">
        {saved.resolved.modelId
          ? <p className="rounded-lg bg-green-50 p-2 text-sm text-green-950">Đang dùng: <b>{byId.get(saved.resolved.modelId)?.label ?? saved.resolved.modelId}</b></p>
          : <p className="flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-950"><CircleAlert size={18} className="shrink-0" aria-hidden /><span><b>Không có model hợp lệ.</b> Task của agent này sẽ chờ. {saved.resolved.blockedBy}</span></p>}
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-semibold">Model chính</span>
          <select className={sel} value={d.primaryId} onChange={(e) => setD({ ...d, primaryId: e.target.value, fallbackIds: d.fallbackIds.filter((x) => x !== e.target.value), escalationId: d.escalationId === e.target.value ? null : d.escalationId })}>{models.map((m) => <option key={m.id} value={m.id}>{label(m)}</option>)}</select>
        </label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Model leo thang</span>
          <select className={sel} value={d.escalationId ?? ''} onChange={(e) => setD({ ...d, escalationId: e.target.value || null, fallbackIds: d.fallbackIds.filter((x) => x !== e.target.value) })}><option value="">Không dùng</option>{models.filter((m) => m.id !== d.primaryId).map((m) => <option key={m.id} value={m.id}>{label(m)}</option>)}</select>
        </label>
      </div>
      <section aria-label="Model dự phòng" className="space-y-2">
        <h3 className="text-sm font-semibold">Model dự phòng (thứ tự thử từ trên xuống, kéo để sắp xếp)</h3>
        {d.fallbackIds.length === 0 && <p className="text-sm text-slate-700">Chưa có model dự phòng: khi model chính lỗi, task sẽ chờ.</p>}
        <SortableList label="Model dự phòng" onChange={(ids) => setD({ ...d, fallbackIds: ids })}
          items={d.fallbackIds.map((id) => ({ id, node: (
            <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm"><b>{byId.get(id)?.label ?? id}</b>{byId.get(id) && <DataClassBadge value={byId.get(id)!.dataClass} />}</span>
              <button aria-label={`Bỏ ${byId.get(id)?.label ?? id}`} onClick={() => setD({ ...d, fallbackIds: d.fallbackIds.filter((x) => x !== id) })} className="rounded p-1 hover:bg-slate-100"><X size={14} /></button></div>) }))} />
        {addable.length > 0 && <select aria-label="Thêm model dự phòng" className={sel} value="" onChange={(e) => e.target.value && setD({ ...d, fallbackIds: [...d.fallbackIds, e.target.value] })}><option value="">+ Thêm model dự phòng…</option>{addable.map((m) => <option key={m.id} value={m.id}>{label(m)}</option>)}</select>}
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {radios('Chế độ định tuyến', d.routing, ROUTING_INFO, (routing: RoutingMode) => setD({ ...d, routing }))}
        {radios('Chế độ riêng tư', d.privacy, PRIVACY_INFO, (privacy: PrivacyMode) => setD({ ...d, privacy }))}
      </div>
      {warnings.length > 0 && (
        <ul role="alert" aria-label="Cảnh báo cấu hình model" className="space-y-1">
          {warnings.map((w, i) => <li key={i} className={`flex gap-2 rounded-lg p-2 text-sm ${w.level === 'error' ? 'bg-red-50 text-red-950' : 'bg-amber-50 text-amber-950'}`}>{w.level === 'error' ? <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden /> : <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />}<span><b>{w.level === 'error' ? 'Lỗi' : 'Lưu ý'}:</b> {w.text}</span></li>)}
        </ul>
      )}
      <section aria-label="Thông tin các model đã chọn" className="space-y-2">
        <h3 className="text-sm font-semibold">Các model đã chọn</h3>
        <ul className="space-y-2">{chain.map((id) => byId.get(id)).filter((m): m is ModelProfile => !!m).map((m) => <li key={m.id} className="rounded-lg border border-slate-200 p-2"><ModelInfo m={m} role={rolesOf(m.id)} /></li>)}</ul>
      </section>
      <div className="flex items-center gap-2">
        <button disabled={!dirty || save.isPending} onClick={() => save.mutate(d)} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Đang lưu…' : 'Lưu cấu hình model'}</button>
        {dirty && <button onClick={() => setD(toInput(saved))} className="text-sm underline">Bỏ thay đổi</button>}
        {blocked && dirty && <span className="text-xs text-red-800">Có lỗi ở trên; vẫn lưu được nhưng agent có thể không chạy.</span>}
      </div>
      <ModelTester models={models} defaultId={d.primaryId} />
    </div>
  )
}
