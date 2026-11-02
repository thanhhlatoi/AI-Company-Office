import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { useDepartmentStore } from '../../store/departmentStore'
import { useUiStore } from '../../store/uiStore'
import { useWorkStore } from '../../store/workStore'
import { useCreateGoal } from './hooks'

const FIELD = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none'

/** Hộp thoại "Mục tiêu mới" (nút nổi hoặc phím G). */
export function GoalComposer() {
  const preset = useUiStore((s) => s.composer.departmentId)
  const departments = useDepartmentStore((s) => s.departmentsById)
  const create = useCreateGoal()
  const paused = useWorkStore((s) => s.system.state === 'PAUSED')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [departmentId, setDepartmentId] = useState(preset ?? '')
  const [budget, setBudget] = useState('')
  const [review, setReview] = useState(true)
  const [errors, setErrors] = useState<{ title?: string; budget?: string }>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (paused) return
    const next: typeof errors = {}
    if (!title.trim()) next.title = 'Hãy nhập tiêu đề'
    const n = Number(budget)
    if (budget && (!Number.isInteger(n) || n <= 0)) next.budget = 'Ngân sách phải là số nguyên dương'
    setErrors(next)
    if (Object.keys(next).length) return
    create.mutate({ title: title.trim(), description: description.trim(), departmentId: departmentId || undefined, tokenBudget: budget ? n : undefined, requirePlanApproval: review })
  }

  return (
    <Modal title="Mục tiêu mới" onClose={() => useUiStore.getState().closeComposer()}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tiêu đề</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Ra 3 video tuần này" className={FIELD} aria-invalid={!!errors.title} />
          {errors.title && <span role="alert" className="mt-1 block text-xs text-red-600">{errors.title}</span>}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Mô tả</span>
          <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả chi tiết kết quả mong muốn, ràng buộc, thời hạn…" className={FIELD} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Phòng phụ trách <span className="font-normal text-slate-600">(tuỳ chọn)</span></span>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={FIELD}>
              <option value="">Để hệ thống chọn</option>
              {Object.values(departments).sort((a, b) => a.order - b.order).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Ngân sách token <span className="font-normal text-slate-600">(tuỳ chọn)</span></span>
            <input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="50000" className={FIELD} aria-invalid={!!errors.budget} />
            {errors.budget && <span role="alert" className="mt-1 block text-xs text-red-600">{errors.budget}</span>}
          </label>
        </div>
        <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
          <input type="checkbox" role="switch" checked={review} onChange={(e) => setReview(e.target.checked)} className="size-4" />
          <span className="text-sm"><b>Duyệt kế hoạch trước khi chạy</b><br /><span className="text-slate-600">Tắt thì mục tiêu chạy ngay khi có kế hoạch.</span></span>
        </label>
        {paused && <p role="status" className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-900">Hệ thống đang tạm dừng: chưa tạo mục tiêu mới được. Bấm "Tiếp tục" ở thanh trên cùng.</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => useUiStore.getState().closeComposer()} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Huỷ</button>
          <button type="submit" disabled={create.isPending || paused} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">
            {create.isPending ? 'Đang tạo…' : 'Tạo mục tiêu'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
