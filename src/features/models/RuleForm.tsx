import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import type { ModelProfile, RoutingRule } from '../../types/models'

const inp = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
type Draft = Pick<RoutingRule, 'id' | 'name' | 'when' | 'modelId'>
const num = (s: string) => (s === '' ? null : Math.max(0, Math.floor(Number(s))))

/** Biểu mẫu một luật: điều kiện (để trống = không xét) -> model. */
export function RuleForm({ initial, models, onSave, onClose }: { initial?: Draft; models: ModelProfile[]; onSave: (r: Draft) => void; onClose: () => void }) {
  const [r, setR] = useState<Draft>(initial ?? { id: '', name: '', when: {}, modelId: models[0]?.id ?? '' })
  const depts = Object.values(useDepartmentStore((s) => s.departmentsById)), agents = Object.values(useAgentStore((s) => s.agentsById))
  const [err, setErr] = useState('')
  const w = (patch: Partial<RoutingRule['when']>) => setR({ ...r, when: { ...r.when, ...patch } })
  const submit = () => {
    if (!r.name.trim()) return setErr('Cần đặt tên luật')
    if (r.when.minTokens != null && r.when.maxTokens != null && r.when.minTokens > r.when.maxTokens) return setErr('Token tối thiểu không được lớn hơn tối đa')
    onSave({ ...r, name: r.name.trim() })
  }
  return (
    <Modal title={initial ? 'Sửa luật' : 'Thêm luật'} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Tên luật<input className={inp} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></label>
        <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-1 font-semibold">Điều kiện (để trống = không xét)</legend>
          <label>Ưu tiên<select className={inp} value={r.when.priority ?? ''} onChange={(e) => w({ priority: (e.target.value || null) as RoutingRule['when']['priority'] })}><option value="">Bất kỳ</option><option value="HIGH">Cao</option><option value="NORMAL">Thường</option><option value="LOW">Thấp</option></select></label>
          <label>Độ nhạy dữ liệu<select className={inp} value={r.when.dataClass ?? ''} onChange={(e) => w({ dataClass: (e.target.value || null) as RoutingRule['when']['dataClass'] })}><option value="">Bất kỳ</option><option value="PUBLIC">Công khai</option><option value="INTERNAL">Nội bộ</option><option value="CONFIDENTIAL">Mật</option></select></label>
          <label>Token tối thiểu<input type="number" min={0} className={inp} value={r.when.minTokens ?? ''} onChange={(e) => w({ minTokens: num(e.target.value) })} /></label>
          <label>Token tối đa<input type="number" min={0} className={inp} value={r.when.maxTokens ?? ''} onChange={(e) => w({ maxTokens: num(e.target.value) })} /></label>
          <label>Phòng ban<select className={inp} value={r.when.departmentId ?? ''} onChange={(e) => w({ departmentId: e.target.value || null })}><option value="">Bất kỳ</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label>Agent<select className={inp} value={r.when.agentId ?? ''} onChange={(e) => w({ agentId: e.target.value || null })}><option value="">Bất kỳ</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        </fieldset>
        <label className="block font-semibold">Dùng model<select className={`${inp} font-normal`} value={r.modelId} onChange={(e) => setR({ ...r, modelId: e.target.value })}>{models.map((m) => <option key={m.id} value={m.id}>{m.label} — {m.dataClass}</option>)}</select></label>
        {err && <p role="alert" className="font-medium text-red-700">{err}</p>}
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-slate-100">Huỷ</button><button onClick={submit} className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark">Xong</button></div>
      </div>
    </Modal>
  )
}
