import { useMemo, useState, type FormEvent } from 'react'
import { useSaveAgent } from '../agents/hooks'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useUiStore } from '../../store/uiStore'
import type { Agent } from '../../types'
import { SaveAsTemplate } from './SaveAsTemplate'
import { useSetHead } from './mutations'

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none'

/** Hồ sơ: tên, vai trò, phòng ban, màu áo, trưởng phòng. Prompt và model sửa ở phần/tab riêng. */
export function ProfileForm({ agent }: { agent: Agent }) {
  const departmentsById = useDepartmentStore((s) => s.departmentsById)
  const departments = useMemo(() => Object.values(departmentsById).sort((a, b) => a.order - b.order), [departmentsById])
  const members = useAgentStore((s) => s.agentsById)
  const [saving, setSaving] = useState(false)
  const [v, setV] = useState({ name: agent.name, role: agent.role, color: agent.color, departmentId: agent.departmentId ?? '' })
  const save = useSaveAgent(), setHead = useSetHead()
  const toast = useUiStore((s) => s.toast)
  const changed = v.name !== agent.name || v.role !== agent.role || v.color !== agent.color || v.departmentId !== (agent.departmentId ?? '')
  const head = departmentsById[agent.departmentId ?? '']?.headAgentId
  const headName = head ? members[head]?.name : null
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!v.name.trim() || !v.role.trim()) return toast('Tên và vai trò là bắt buộc', 'error')
    save.mutate({ id: agent.id, input: { name: v.name.trim(), role: v.role.trim(), color: v.color, systemPrompt: agent.systemPrompt, model: agent.model, departmentId: v.departmentId || null } }, { onSuccess: () => toast('Đã lưu hồ sơ'), onError: () => toast('Lưu hồ sơ thất bại', 'error') })
  }
  return (
    <>
    <form onSubmit={submit} aria-label="Hồ sơ agent" className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-medium">Tên</span><input className={input} value={v.name} onChange={set('name')} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Vai trò</span><input className={input} value={v.role} onChange={set('role')} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Phòng ban</span>
          <select className={input} value={v.departmentId} onChange={set('departmentId')}><option value="">Chưa phân phòng</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Màu áo</span><input type="color" className="h-9 w-16 cursor-pointer" value={v.color} onChange={set('color')} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!changed || save.isPending} className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
        {agent.departmentId && (agent.isHead
          ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Trưởng phòng</span>
          : <button type="button" disabled={setHead.isPending} onClick={() => setHead.mutate({ departmentId: agent.departmentId!, agentId: agent.id })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">Đặt làm trưởng phòng{headName ? ` (thay ${headName})` : ''}</button>)}
        <button type="button" onClick={() => setSaving(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Lưu thành mẫu…</button>
      </div>
    </form>
    {saving && <SaveAsTemplate agent={agent} onClose={() => setSaving(false)} />}
    </>
  )
}
