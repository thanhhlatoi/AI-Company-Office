import { useState } from 'react'
import { SortableList } from '../../components/studio/SortableList'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import type { RoutingRule } from '../../types/models'
import { useModelProfiles, useRoutingRules } from '../studio/queries'
import { useSaveRules } from './modelMutations'
import { RuleForm } from './RuleForm'
import { describeWhen } from './ruleText'
import { Simulator } from './Simulator'

type Draft = Pick<RoutingRule, 'id' | 'name' | 'when' | 'modelId'>

/** Luật định tuyến theo thứ tự (luật đầu tiên khớp thắng): kéo sắp xếp, thêm/sửa/xoá, lưu một lần; kèm ô mô phỏng. */
export function RulesTab() {
  const q = useRoutingRules(), models = useModelProfiles().data ?? []
  const depts = useDepartmentStore((s) => s.departmentsById), agents = useAgentStore((s) => s.agentsById)
  const save = useSaveRules()
  const [draft, setDraft] = useState<Draft[] | null>(null)
  const [edit, setEdit] = useState<{ index: number | null } | null>(null)
  if (q.isLoading) return <div className="h-40 animate-pulse rounded-card bg-slate-200" />
  if (q.isError) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được luật. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
  const saved: Draft[] = (q.data ?? []).map((r) => ({ id: r.id, name: r.name, when: r.when, modelId: r.modelId }))
  const list = draft ?? saved, dirty = draft !== null
  const names = { department: (id: string) => depts[id]?.name, agent: (id: string) => agents[id]?.name }
  const rid = (r: Draft, i: number) => r.id || `new-${i}`
  const label = (id: string) => models.find((m) => m.id === id)?.label ?? id
  const items = list.map((r, i) => ({ id: rid(r, i), node: (
    <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-mono text-xs text-slate-700">{i + 1}</span><b>{r.name}</b><span className="text-slate-700">{describeWhen(r.when, names)}</span><span>→ <b>{label(r.modelId)}</b></span>
      <span className="ml-auto flex gap-1"><button onClick={() => setEdit({ index: i })} className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50">Sửa</button><button aria-label={`Xoá luật ${r.name}`} onClick={() => setDraft(list.filter((_, j) => j !== i))} className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-800 hover:bg-red-50">Xoá</button></span></div>) }))
  const reorder = (ids: string[]) => setDraft(ids.map((id) => list.find((r, i) => rid(r, i) === id) as Draft))
  const upsert = (r: Draft, index: number | null) => { setDraft(index === null ? [...list, r] : list.map((x, i) => (i === index ? r : x))); setEdit(null) }
  return (
    <div className="space-y-5">
      <section aria-label="Luật định tuyến" className="space-y-2">
        <p className="text-sm text-slate-700">Áp dụng cho agent dùng chế độ định tuyến <b>Theo luật</b>. Luật đứng trên được xét trước; luật đầu tiên khớp sẽ chọn model. Nên có một luật cuối “Mọi task”.</p>
        {list.length === 0 ? <p className="rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-700">Chưa có luật nào.</p> : <SortableList label="Luật định tuyến" items={items} onChange={reorder} />}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setEdit({ index: null })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">+ Thêm luật</button>
          <button disabled={!dirty || save.isPending} onClick={() => save.mutate(list, { onSuccess: () => setDraft(null) })} className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Đang lưu…' : 'Lưu luật'}</button>
          {dirty && <button onClick={() => setDraft(null)} className="text-sm underline">Bỏ thay đổi</button>}
        </div>
      </section>
      {dirty && <p role="status" className="text-xs font-semibold text-amber-900">Có thay đổi chưa lưu — ô mô phỏng bên dưới dùng luật ĐÃ LƯU.</p>}
      <Simulator />
      {edit && <RuleForm key={edit.index ?? 'new'} initial={edit.index === null ? undefined : list[edit.index]} models={models} onSave={(r) => upsert(r, edit.index)} onClose={() => setEdit(null)} />}
    </div>
  )
}
