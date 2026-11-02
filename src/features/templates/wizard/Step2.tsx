import { TriangleAlert } from 'lucide-react'
import { DataClassBadge, HealthDot } from '../../../components/studio/badges'
import { useDeviceStore } from '../../../store/deviceStore'
import type { ModelProfile } from '../../../types/models'
import type { AgentTemplate } from '../../../types/studio'
import { PRIVACY_INFO, policyWarnings } from '../../studio/modelRules'
import { recommendModels } from '../logic'
import type { Draft } from '../wizardLogic'

/** Bước 2: model gợi ý theo yêu cầu của mẫu (ưu tiên local nếu mẫu nói vậy), đổi được; chế độ riêng tư. */
export function Step2({ t, d, set, models, hasTools }: { t: AgentTemplate; d: Draft; set: (p: Partial<Draft>) => void; models: ModelProfile[]; hasTools: boolean }) {
  const devices = useDeviceStore((s) => s.devicesById)
  const fits = recommendModels(t.modelRequirement, models)
  const warns = policyWarnings({ primaryId: d.primaryId, fallbackIds: d.fallbackIds, escalationId: null, routing: 'FIXED', privacy: d.privacy }, models, hasTools, (id) => devices[id]?.status === 'OFFLINE')
  return (
    <div className="space-y-4 text-sm">
      <fieldset className="space-y-1.5"><legend className="mb-1 font-semibold">Model chính {t.modelRequirement.preferLocal && <span className="font-normal text-green-900">(mẫu ưu tiên LOCAL)</span>}</legend>
        {fits.map(({ model: m, fit, note }) => (
          <label key={m.id} className={`flex items-center gap-2 rounded-lg border p-2 ${d.primaryId === m.id ? 'border-brand bg-blue-50' : 'border-slate-200'} ${fit ? '' : 'opacity-60'}`}>
            <input type="radio" name="primary" checked={d.primaryId === m.id} disabled={!fit} onChange={() => set({ primaryId: m.id, fallbackIds: d.fallbackIds.filter((x) => x !== m.id) })} />
            <span className="font-medium">{m.label}</span><DataClassBadge value={m.dataClass} /><HealthDot status={m.health.status} /><span className="ml-auto text-xs text-slate-700">{note}</span>
          </label>))}</fieldset>
      <fieldset className="space-y-1.5"><legend className="mb-1 font-semibold">Chế độ riêng tư</legend>
        {(Object.keys(PRIVACY_INFO) as (keyof typeof PRIVACY_INFO)[]).map((k) => <label key={k} className={`flex items-start gap-2 rounded-lg border p-2 ${d.privacy === k ? 'border-brand bg-blue-50' : 'border-slate-200'}`}><input type="radio" name="privacy" checked={d.privacy === k} onChange={() => set({ privacy: k })} className="mt-1" /><span><b>{PRIVACY_INFO[k].label}</b><span className="block text-xs text-slate-700">{PRIVACY_INFO[k].hint}</span></span></label>)}</fieldset>
      {warns.length > 0 && <ul role="alert" className="space-y-1">{warns.map((w, i) => <li key={i} className={`flex gap-2 rounded-lg p-2 ${w.level === 'error' ? 'bg-red-50 text-red-950' : 'bg-amber-50 text-amber-950'}`}><TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />{w.text}</li>)}</ul>}
    </div>
  )
}
