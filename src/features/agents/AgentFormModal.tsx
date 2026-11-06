import { useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { LOCAL_MODELS } from '../../lib/config'
import { MAX_SKILLS, MAX_SKILL_LEN, parseSkills } from '../../lib/skills'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useUiStore } from '../../store/uiStore'
import { AgentInputSchema, type AgentInput } from '../../types'
import { useLocalModelIds } from '../models/useLocalModels'
import { useSaveAgent } from './hooks'

type Errors = Partial<Record<keyof AgentInput, string>>
const EMPTY: AgentInput = { name: '', role: '', systemPrompt: '', model: LOCAL_MODELS[0], color: '#2563eb', skills: [] }
/** Chỉ model bot chạy được; giữ cả giá trị hiện có của agent (vd local.small) để không bị đổi âm thầm. */
const modelOptions = (local: readonly string[], current: string) => [...new Set([...local, current].filter(Boolean))]
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none'

export function AgentFormModal() {
  const { open, editId, departmentId } = useUiStore((s) => s.form)
  if (!open) return null
  // key buộc form dựng lại state mỗi lần mở (tạo mới <-> sửa agent khác)
  return <Form key={`${editId ?? 'new'}|${departmentId ?? ''}`} editId={editId} presetDepartmentId={departmentId} />
}

function Form({ editId, presetDepartmentId }: { editId: string | null; presetDepartmentId: string | null }) {
  const closeForm = useUiStore((s) => s.closeForm)
  const toast = useUiStore((s) => s.toast)
  const editing = useAgentStore((s) => (editId ? s.agentsById[editId] : undefined))
  const departmentsById = useDepartmentStore((s) => s.departmentsById)
  const departments = useMemo(() => Object.values(departmentsById).sort((a, b) => a.order - b.order), [departmentsById])
  const focusId = useUiStore((s) => s.focusDepartmentId)
  const save = useSaveAgent()
  const localModels = useLocalModelIds()
  // Agent mới mặc định vào phòng được chỉ định, nếu không thì phòng đang xem
  const [values, setValues] = useState<AgentInput>(editing ?? { ...EMPTY, departmentId: presetDepartmentId ?? focusId ?? '' })
  const [skillsText, setSkillsText] = useState((editing?.skills ?? []).join(', '))
  const [errors, setErrors] = useState<Errors>({})
  const set = (k: keyof AgentInput) => (e: { target: { value: string } }) => setValues({ ...values, [k]: e.target.value })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = AgentInputSchema.safeParse({ ...values, skills: parseSkills(skillsText) })
    if (!parsed.success) {
      const errs: Errors = {}
      for (const i of parsed.error.issues) errs[i.path[0] as keyof AgentInput] ??= i.message
      return setErrors(errs)
    }
    setErrors({})
    save.mutate(
      { id: editId ?? undefined, input: { ...parsed.data, departmentId: parsed.data.departmentId || null } },
      {
        onSuccess: () => { toast(editId ? 'Đã lưu agent' : 'Đã tạo agent'); closeForm() },
        onError: () => toast('Lưu agent thất bại', 'error'),
      },
    )
  }

  const field = (k: keyof AgentInput, label: string, control: React.ReactNode) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {control}
      {errors[k] && <span role="alert" className="mt-1 block text-xs text-red-600">{errors[k]}</span>}
    </label>
  )

  return (
    <Modal title={editId ? 'Sửa agent' : 'Thêm agent'} onClose={closeForm}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {field('name', 'Tên', <input autoFocus className={input} value={values.name} onChange={set('name')} />)}
        {field('role', 'Vai trò', <input className={input} value={values.role} onChange={set('role')} />)}
        {field('systemPrompt', 'System prompt', <textarea rows={6} className={input} value={values.systemPrompt} onChange={set('systemPrompt')} />)}
        {field('model', 'Model', (
          <select className={input} value={values.model} onChange={set('model')}>
            {modelOptions(localModels, values.model).map((m) => <option key={m}>{m}</option>)}
          </select>
        ))}
        {field('departmentId', 'Phòng ban', (
          <select className={input} value={values.departmentId ?? ''} onChange={set('departmentId')}>
            <option value="">Chưa phân phòng</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ))}
        {field('skills', 'Nhãn chuyên môn', (
          <>
            <input className={input} value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="viết kịch bản, tiếng Việt, dịch EN" />
            <span className="mt-1 block text-xs text-slate-600">Cách nhau bằng dấu phẩy. Tối đa {MAX_SKILLS} nhãn, mỗi nhãn {MAX_SKILL_LEN} ký tự (phần dư bị cắt). Dùng để chọn agent giao việc, không phải skill của bot (skill thật ở tab Skill).</span>
          </>
        ))}
        {field('color', 'Màu áo', <input type="color" className="h-9 w-16 cursor-pointer" value={values.color} onChange={set('color')} />)}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={closeForm} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Huỷ</button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">
            {save.isPending ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
