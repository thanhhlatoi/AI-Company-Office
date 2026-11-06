import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../../api/http'
import { DepartmentIcon, ICON_CHOICES } from '../../components/DepartmentIcon'
import { Modal } from '../../components/Modal'
import { PROP_INFO, PROP_SLOTS, SELECTABLE_PROPS, monitorsOf, roomProps, type PropKind } from '../../config/departments'
import { slugify } from '../../lib/text'
import { useDepartmentStore } from '../../store/departmentStore'
import { useUiStore } from '../../store/uiStore'
import { PALETTES, contrastRatio } from '../../styles/tokens'
import type { Department } from '../../types'
import { useSaveDepartment } from './hooks'

/** Lỗi 404/405 = BE chưa có endpoint phòng ban; lỗi khác hiện message của BE nếu có. */
export function errorText(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.status === 404 || err.status === 405 ? 'Backend chưa hỗ trợ tạo/sửa/xoá phòng ban (xem docs/MISSING_API.md, mục A1b)' : err.serverMessage ?? fallback
  return fallback
}
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none'
const SWATCHES = Object.values(PALETTES).map((p) => p.accent)

export function DepartmentFormModal() {
  const { open, editId } = useUiStore((s) => s.deptForm)
  const editing = useDepartmentStore((s) => (editId ? s.departmentsById[editId] : undefined))
  if (!open) return null
  // key buộc form dựng lại state mỗi lần mở (tạo mới <-> sửa phòng khác)
  return <Form key={editId ?? 'new'} editing={editing} />
}

function Form({ editing }: { editing?: Department }) {
  const close = useUiStore((s) => s.closeDeptForm)
  const toast = useUiStore((s) => s.toast)
  const save = useSaveDepartment()
  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? 'building')
  const [color, setColor] = useState(editing?.color ?? SWATCHES[0])
  const [monitors, setMonitors] = useState(editing ? monitorsOf(editing.slug, editing.monitorsPerDesk) : 1)
  // props theo ô: mỗi ô chứa tối đa một món
  const [bySlot, setBySlot] = useState<Record<string, PropKind | ''>>(() => {
    const init: Record<string, PropKind | ''> = {}
    for (const k of editing ? roomProps(editing.slug, editing.props) : []) init[PROP_INFO[k].slot] = k
    return init
  })
  const [headName, setHeadName] = useState('')
  const [headRole, setHeadRole] = useState('')
  const [error, setError] = useState('')

  const lowContrast = contrastRatio(color, '#ffffff') < 3 && contrastRatio(color, '#0f172a') < 3

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (n.length < 2) return setError('Tên phòng cần ít nhất 2 ký tự')
    if (n.length > 40) return setError('Tên phòng tối đa 40 ký tự')
    setError('')
    const props = Object.values(bySlot).filter(Boolean) as string[]
    save.mutate(
      { id: editing?.id, input: { name: n, icon, color, props, monitorsPerDesk: monitors, ...(editing ? {} : { headName, headRole }) } },
      {
        onSuccess: () => { toast(editing ? 'Đã lưu phòng ban' : 'Đã tạo phòng ban'); close() },
        onError: (err) => setError(errorText(err, 'Lưu phòng ban thất bại')),
      },
    )
  }

  const field = (label: string, control: ReactNode, hint?: string) => (
    <div className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {control}
      {hint && <span className="mt-1 block text-xs text-slate-600">{hint}</span>}
    </div>
  )

  return (
    <Modal title={editing ? `Sửa phòng: ${editing.name}` : 'Tạo phòng ban'} onClose={close}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {field('Tên phòng', <input autoFocus aria-label="Tên phòng" className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing & Truyền thông" />,
          editing ? `Đường dẫn: /department/${editing.slug} (không đổi khi sửa tên)` : name.trim() ? `Đường dẫn: /department/${slugify(name) || 'phong-ban'}` : undefined)}

        {field('Icon', (
          <div role="radiogroup" aria-label="Icon" className="flex flex-wrap gap-1.5">
            {ICON_CHOICES.map((i) => (
              <button key={i} type="button" role="radio" aria-checked={icon === i} aria-label={i} title={i} onClick={() => setIcon(i)}
                className={`grid size-9 place-items-center rounded-lg border ${icon === i ? 'border-brand bg-brand/10 text-brand-dark' : 'border-slate-200 hover:bg-slate-50'}`}>
                <DepartmentIcon name={i} size={18} />
              </button>
            ))}
          </div>
        ))}

        {field('Màu phòng', (
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button key={c} type="button" aria-label={`Màu ${c}`} aria-pressed={color.toLowerCase() === c} onClick={() => setColor(c)}
                className={`size-7 rounded-full border-2 ${color.toLowerCase() === c ? 'border-slate-900' : 'border-white ring-1 ring-slate-300'}`} style={{ background: c }} />
            ))}
            <input type="color" aria-label="Chọn màu tuỳ ý" className="h-8 w-12 cursor-pointer" value={color} onChange={(e) => setColor(e.target.value)} />
            <span className="rounded px-2 py-1 text-xs font-semibold" style={{ background: color, color: contrastRatio(color, '#ffffff') >= 4.5 ? '#ffffff' : '#0f172a' }}>Xem thử</span>
          </div>
        ), lowContrast ? 'Màu này khá nhạt, tên phòng có thể khó đọc. Nên chọn màu đậm hơn.' : 'Sàn và tường tự lấy theo màu này.')}

        {field('Số màn hình mỗi bàn', (
          <select aria-label="Số màn hình mỗi bàn" className={input} value={monitors} onChange={(e) => setMonitors(Number(e.target.value))}>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n} màn hình</option>)}
          </select>
        ))}

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Đồ trang trí</legend>
          <div className="grid grid-cols-2 gap-2">
            {PROP_SLOTS.map(({ slot, label }) => {
              const choices = SELECTABLE_PROPS.filter((k) => PROP_INFO[k].slot === slot)
              return (
                <label key={slot} className="block text-xs text-slate-600">
                  {label}
                  <select aria-label={`Đồ trang trí: ${label}`} className={`${input} mt-0.5 text-slate-900`} value={bySlot[slot] ?? ''} onChange={(e) => setBySlot({ ...bySlot, [slot]: e.target.value as PropKind | '' })}>
                    <option value="">Không có</option>
                    {choices.map((k) => <option key={k} value={k}>{PROP_INFO[k].label}</option>)}
                  </select>
                </label>
              )
            })}
          </div>
        </fieldset>

        {!editing && (
          <fieldset className="space-y-2 rounded-lg bg-slate-50 p-3">
            <legend className="px-1 text-sm font-medium">Trưởng phòng (tuỳ chọn)</legend>
            <input aria-label="Tên trưởng phòng" className={input} value={headName} onChange={(e) => setHeadName(e.target.value)} placeholder="Tên agent, ví dụ: Trưởng Marketing" />
            <input aria-label="Vai trò trưởng phòng" className={input} value={headRole} onChange={(e) => setHeadRole(e.target.value)} placeholder="Vai trò, ví dụ: Chiến lược nội dung" />
            <p className="text-xs text-slate-600">Nhân viên thêm sau bằng nút "Thêm agent vào phòng".</p>
          </fieldset>
        )}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={close} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Huỷ</button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">
            {save.isPending ? 'Đang lưu…' : editing ? 'Lưu' : 'Tạo phòng'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
