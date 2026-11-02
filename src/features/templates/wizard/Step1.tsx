import { useDepartmentStore } from '../../../store/departmentStore'
import type { AgentTemplate } from '../../../types/studio'
import type { Draft } from '../wizardLogic'

const inp = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
/** Bước 1: tên, vai trò, phòng ban, điền biến của mẫu (mặc định có sẵn, biến bắt buộc phải điền). */
export function Step1({ t, d, set, tried }: { t: AgentTemplate; d: Draft; set: (p: Partial<Draft>) => void; tried: boolean }) {
  const depts = Object.values(useDepartmentStore((s) => s.departmentsById)).sort((a, b) => a.order - b.order)
  const err = (bad: boolean) => (tried && bad ? <span role="alert" className="text-xs font-medium text-red-700">Bắt buộc</span> : null)
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>Tên agent *<input className={inp} value={d.name} onChange={(e) => set({ name: e.target.value })} />{err(!d.name.trim())}</label>
        <label>Vai trò *<input className={inp} value={d.role} onChange={(e) => set({ role: e.target.value })} placeholder={t.description.slice(0, 40)} />{err(!d.role.trim())}</label>
        <label>Phòng ban<select className={inp} value={d.departmentId} onChange={(e) => set({ departmentId: e.target.value })}><option value="">Chưa phân phòng</option>{depts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      </div>
      {t.variables.length > 0 && (
        <fieldset className="space-y-2 rounded-card border border-slate-200 p-3"><legend className="px-1 font-semibold">Biến của mẫu</legend>
          {t.variables.map((v) => <label key={v.key} className="block">{v.label}{v.required && ' *'} <span className="font-mono text-xs text-slate-700">{`{{${v.key}}}`}</span><input className={inp} value={d.vars[v.key] ?? ''} onChange={(e) => set({ vars: { ...d.vars, [v.key]: e.target.value } })} />{err(v.required && !(d.vars[v.key] ?? '').trim())}</label>)}</fieldset>
      )}
    </div>
  )
}
