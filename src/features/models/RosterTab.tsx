import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { StatusBadge } from '../../components/StatusBadge'
import { DataClassBadge } from '../../components/studio/badges'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useUiStore } from '../../store/uiStore'
import { useModelPolicies, useModelProfiles } from '../studio/queries'
import { buildRoster, filterBySkills, skillCounts } from './roster'
import { SkillChips } from './SkillChips'

/** Khung "Hermes nhìn thấy": ai có kỹ năng nào, đang dùng model nào. Chỉ hiển thị; việc giao thật do BE thực hiện. */
export function RosterTab() {
  const agents = useAgentStore((s) => s.agentsById), deps = useDepartmentStore((s) => s.departmentsById)
  const openForm = useUiStore((s) => s.openForm)
  const pol = useModelPolicies(), prof = useModelProfiles()
  const [sel, setSel] = useState<string[]>([])
  const all = useMemo(() => buildRoster(Object.values(agents), Object.values(deps), pol.data ?? [], prof.data ?? []), [agents, deps, pol.data, prof.data])
  const counts = useMemo(() => skillCounts(all), [all])
  const rows = filterBySkills(all, sel)
  const toggle = (s: string) => setSel((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))

  if (pol.isError || prof.isError) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được chính sách model. <button className="underline" onClick={() => { void pol.refetch(); void prof.refetch() }}>Thử lại</button></p>
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800">Bảng này là những gì <strong>Hermes (Tổng điều phối)</strong> cần biết để giao việc: mỗi agent có kỹ năng gì và đang chạy model nào. Màn hình chỉ hiển thị và cho khai báo kỹ năng; việc Hermes chọn agent và giao task là do BE thực hiện.</p>
      <div>
        <h2 className="mb-1 text-sm font-semibold">Lọc theo kỹ năng {sel.length > 0 && <button onClick={() => setSel([])} className="ml-2 text-xs font-normal underline">Bỏ lọc</button>}</h2>
        {counts.length === 0 ? <p className="text-sm text-slate-700">Chưa agent nào khai báo kỹ năng. Mở agent → Sửa → ô “Kỹ năng”.</p>
          : <ul className="flex flex-wrap gap-1.5">{counts.map(([s, n]) => (
            <li key={s}><button aria-pressed={sel.includes(s)} onClick={() => toggle(s)} className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs hover:bg-slate-50 aria-pressed:border-brand aria-pressed:bg-brand/10 aria-pressed:font-semibold">{s} <span className="text-slate-600">({n})</span></button></li>
          ))}</ul>}
      </div>
      <p aria-live="polite" className="text-xs text-slate-700">{rows.length}/{all.length} agent{sel.length > 0 ? `, có đủ: ${sel.join(' + ')}` : ''}</p>
      {rows.length === 0 ? <p className="rounded-card border border-dashed border-slate-300 p-8 text-center text-sm text-slate-700">Không có agent nào có đủ các kỹ năng đã chọn.</p> : (
        <div className="overflow-x-auto rounded-card border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left"><tr>{['Agent', 'Phòng', 'Kỹ năng', 'Model đang dùng', 'Trạng thái', ''].map((h) => <th key={h} scope="col" className="p-2 font-semibold">{h || <span className="sr-only">Thao tác</span>}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <th scope="row" className="p-2 text-left font-medium">{r.name}{r.isHead && <span className="ml-1 text-xs font-normal text-slate-600">(trưởng phòng)</span>}<span className="block text-xs font-normal text-slate-600">{r.role}</span></th>
                <td className="p-2">{r.department}</td>
                <td className="p-2"><SkillChips skills={r.skills} /></td>
                <td className="p-2">{r.model ? <span className="flex flex-wrap items-center gap-1.5">{r.model.label}<DataClassBadge value={r.model.dataClass} /></span>
                  : r.hasPolicy ? <span className="text-red-800">Không có model hợp lệ<span className="block text-xs">{r.blockedBy}</span></span> : <span className="text-slate-700">{r.legacyModel}<span className="block text-xs">chưa có chính sách model</span></span>}</td>
                <td className="p-2"><StatusBadge agent={r} /></td>
                <td className="whitespace-nowrap p-2 text-right">
                  <button onClick={() => openForm(r.id)} className="rounded-lg border border-slate-300 px-2 py-1 hover:bg-slate-50" aria-label={`Sửa kỹ năng của ${r.name}`}>Sửa kỹ năng</button>{' '}
                  <Link to={`/agents/${r.id}/studio?tab=model`} className="rounded-lg border border-slate-300 px-2 py-1 hover:bg-slate-50" aria-label={`Đổi model của ${r.name}`}>Đổi model</Link>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
