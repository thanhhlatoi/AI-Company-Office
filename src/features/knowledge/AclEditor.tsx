import { TriangleAlert } from 'lucide-react'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import type { Access, CollectionInput, Sensitivity } from '../../types/knowledge'
import { ACCESS_LABEL } from './access'

type Entry = CollectionInput['acl'][number]
const sel = 'rounded-lg border border-slate-300 px-2 py-1 text-sm'

/** Ai được truy cập bộ sưu tập. Mục AGENT thắng mục phòng ban, mục phòng ban thắng "Tất cả"; mục "Không" là chặn rõ ràng. */
export function AclEditor({ acl, onChange, sensitivity }: { acl: Entry[]; onChange: (a: Entry[]) => void; sensitivity: Sensitivity }) {
  const depts = Object.values(useDepartmentStore((s) => s.departmentsById)), agents = Object.values(useAgentStore((s) => s.agentsById))
  const set = (i: number, p: Partial<Entry>) => onChange(acl.map((e, j) => (j === i ? { ...e, ...p } : e)))
  const wide = sensitivity === 'CONFIDENTIAL' && acl.some((e) => e.kind === 'ALL' && e.access !== 'NONE')
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">Quyền truy cập</legend>
      <p className="text-xs text-slate-700">Agent chỉ thấy bộ sưu tập (và tìm được trong đó) khi có quyền. Thứ tự ưu tiên: agent &gt; phòng ban &gt; tất cả.</p>
      {acl.length === 0 && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-950">Chưa cấp cho ai: chỉ Quản trị thấy bộ sưu tập này.</p>}
      <ul className="space-y-1.5">
        {acl.map((e, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <select aria-label="Đối tượng" className={sel} value={e.kind} onChange={(ev) => set(i, { kind: ev.target.value as Entry['kind'], id: null })}><option value="ALL">Tất cả agent</option><option value="DEPARTMENT">Phòng ban</option><option value="AGENT">Một agent</option></select>
            {e.kind === 'DEPARTMENT' && <select aria-label="Phòng ban" className={sel} value={e.id ?? ''} onChange={(ev) => set(i, { id: ev.target.value })}><option value="">Chọn phòng…</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
            {e.kind === 'AGENT' && <select aria-label="Agent" className={sel} value={e.id ?? ''} onChange={(ev) => set(i, { id: ev.target.value })}><option value="">Chọn agent…</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
            <select aria-label="Quyền" className={sel} value={e.access} onChange={(ev) => set(i, { access: ev.target.value as Access })}>{(['READ', 'WRITE', 'NONE'] as const).map((a) => <option key={a} value={a}>{ACCESS_LABEL[a]}</option>)}</select>
            <button type="button" aria-label="Bỏ mục quyền" onClick={() => onChange(acl.filter((_, j) => j !== i))} className="rounded px-2 text-lg leading-none hover:bg-slate-100">×</button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...acl, { kind: 'DEPARTMENT', id: null, access: 'READ' }])} className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">+ Thêm quyền</button>
      {wide && <p role="alert" className="flex gap-2 rounded-lg border border-orange-300 bg-orange-50 p-2 text-sm text-orange-950"><TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />Bộ sưu tập MẬT đang mở cho TẤT CẢ agent. Nên giới hạn theo phòng ban hoặc từng agent.</p>}
    </fieldset>
  )
}
