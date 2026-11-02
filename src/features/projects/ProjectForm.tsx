import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { usdToMicro } from '../../lib/money'
import { useDepartmentStore } from '../../store/departmentStore'
import { useCreateProject } from './hooks'

const COLORS = ['#c93d31', '#a8379a', '#2563eb', '#15803d', '#b8530a', '#0e7490']
const FIELD = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none'

/** Hộp thoại "Dự án mới": tên, mô tả, phòng ban, màu, hạn chót, ngân sách (USD). */
export function ProjectForm({ onClose }: { onClose: () => void }) {
  const departments = Object.values(useDepartmentStore((s) => s.departmentsById)).sort((a, b) => a.order - b.order)
  const create = useCreateProject()
  const [name, setName] = useState(''), [description, setDescription] = useState(''), [dept, setDept] = useState(''), [color, setColor] = useState(COLORS[2])
  const [due, setDue] = useState(''), [budget, setBudget] = useState('')
  const [errors, setErrors] = useState<{ name?: string; budget?: string }>({})
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const b = Number(budget)
    const next = { name: name.trim() ? undefined : 'Hãy nhập tên dự án', budget: budget && !(b > 0) ? 'Ngân sách phải lớn hơn 0' : undefined }
    setErrors(next)
    if (next.name || next.budget) return
    create.mutate({ name: name.trim(), description: description.trim(), departmentId: dept || null, color, dueDate: due ? new Date(`${due}T23:59:59+07:00`).toISOString() : null, budgetMicro: budget ? usdToMicro(b) : null }, { onSuccess: onClose })
  }
  return (
    <Modal title="Dự án mới" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <label className="block"><span className="mb-1 block text-sm font-medium">Tên dự án</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={FIELD} aria-invalid={!!errors.name} />{errors.name && <span role="alert" className="mt-1 block text-xs text-red-600">{errors.name}</span>}</label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Mô tả</span><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={FIELD} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm font-medium">Phòng ban</span><select value={dept} onChange={(e) => setDept(e.target.value)} className={FIELD}><option value="">Không thuộc phòng</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-sm font-medium">Hạn chót</span><input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={FIELD} /></label>
        </div>
        <label className="block"><span className="mb-1 block text-sm font-medium">Ngân sách (USD, tuỳ chọn)</span><input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="50" className={FIELD} aria-invalid={!!errors.budget} />{errors.budget && <span role="alert" className="mt-1 block text-xs text-red-600">{errors.budget}</span>}</label>
        <fieldset><legend className="mb-1 text-sm font-medium">Màu</legend>
          <div className="flex gap-2">{COLORS.map((c) => <label key={c} className="cursor-pointer"><input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} className="peer sr-only" /><span aria-label={`Màu ${c}`} className="block size-8 rounded-full border-2 border-white outline-offset-2 peer-checked:outline-2 peer-checked:outline-slate-900 peer-focus-visible:outline-2 peer-focus-visible:outline-brand" style={{ background: c }} /></label>)}</div>
        </fieldset>
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Huỷ</button><button type="submit" disabled={create.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{create.isPending ? 'Đang tạo…' : 'Tạo dự án'}</button></div>
      </form>
    </Modal>
  )
}
