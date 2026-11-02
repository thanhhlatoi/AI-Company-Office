import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { CollectionInputSchema, type CollectionInput } from '../../types/knowledge'
import { useEmbeddingModels } from '../studio/queries'
import { AclEditor } from './AclEditor'
import { useSaveCollection } from './mutations'

const inp = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
const EMPTY: CollectionInput = { name: '', description: '', sensitivity: 'INTERNAL', scope: { kind: 'SHARED', id: null }, embeddingModelId: '', chunking: { size: 800, overlap: 100 }, acl: [{ kind: 'ALL', id: null, access: 'READ' }], syncFolder: null }

/** Tạo bộ sưu tập. Model embedding được LỌC theo độ nhạy: dữ liệu MẬT chỉ cho phép model LOCAL. */
export function CollectionForm({ onClose, onCreated }: { onClose: () => void; onCreated?: (id: string) => void }) {
  const [v, setV] = useState<CollectionInput>(EMPTY)
  const [err, setErr] = useState('')
  const save = useSaveCollection()
  const embs = useEmbeddingModels().data ?? []
  const depts = Object.values(useDepartmentStore((s) => s.departmentsById)), agents = Object.values(useAgentStore((s) => s.agentsById))
  const allowed = embs.filter((e) => v.sensitivity !== 'CONFIDENTIAL' || e.dataClass === 'LOCAL')
  const emb = allowed.some((e) => e.id === v.embeddingModelId) ? v.embeddingModelId : allowed[0]?.id ?? ''
  const submit = () => {
    const parsed = CollectionInputSchema.safeParse({ ...v, embeddingModelId: emb })
    if (!parsed.success) return setErr(parsed.error.issues[0].message)
    if (v.scope.kind !== 'SHARED' && !v.scope.id) return setErr('Chọn phòng ban / agent cho phạm vi')
    if (v.acl.some((e) => e.kind !== 'ALL' && !e.id)) return setErr('Còn mục quyền chưa chọn đối tượng')
    setErr(''); save.mutate(parsed.data, { onSuccess: (c) => { onCreated?.(c.id); onClose() } })
  }
  return (
    <Modal title="Tạo bộ sưu tập" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Tên<input className={inp} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
        <label className="block">Mô tả<input className={inp} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Độ nhạy<select className={inp} value={v.sensitivity} onChange={(e) => setV({ ...v, sensitivity: e.target.value as CollectionInput['sensitivity'] })}><option value="PUBLIC">Công khai</option><option value="INTERNAL">Nội bộ</option><option value="CONFIDENTIAL">Mật</option></select></label>
          <label>Phạm vi<select className={inp} value={v.scope.kind} onChange={(e) => setV({ ...v, scope: { kind: e.target.value as CollectionInput['scope']['kind'], id: null } })}><option value="SHARED">Chung toàn công ty</option><option value="DEPARTMENT">Một phòng ban</option><option value="AGENT">Một agent</option></select></label>
          {v.scope.kind === 'DEPARTMENT' && <label>Phòng ban<select className={inp} value={v.scope.id ?? ''} onChange={(e) => setV({ ...v, scope: { ...v.scope, id: e.target.value } })}><option value="">Chọn…</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
          {v.scope.kind === 'AGENT' && <label>Agent<select className={inp} value={v.scope.id ?? ''} onChange={(e) => setV({ ...v, scope: { ...v.scope, id: e.target.value } })}><option value="">Chọn…</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
        </div>
        <label className="block">Model embedding<select className={inp} value={emb} onChange={(e) => setV({ ...v, embeddingModelId: e.target.value })}>{allowed.map((e) => <option key={e.id} value={e.id}>{e.label} — {e.dataClass}</option>)}</select>
          {v.sensitivity === 'CONFIDENTIAL' && <span className="mt-0.5 block text-xs text-slate-700">Dữ liệu MẬT chỉ được nhúng bằng model LOCAL nên các model CLOUD đã bị ẩn.</span>}</label>
        <AclEditor acl={v.acl} onChange={(acl) => setV({ ...v, acl })} sensitivity={v.sensitivity} />
        <details className="rounded-lg border border-slate-200 p-2"><summary className="cursor-pointer font-medium">Nâng cao: cắt đoạn và đồng bộ</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label>Cỡ đoạn (token)<input type="number" min={100} className={inp} value={v.chunking.size} onChange={(e) => setV({ ...v, chunking: { ...v.chunking, size: Math.floor(Number(e.target.value)) } })} /></label>
            <label>Chồng lấn (token)<input type="number" min={0} className={inp} value={v.chunking.overlap} onChange={(e) => setV({ ...v, chunking: { ...v.chunking, overlap: Math.floor(Number(e.target.value)) } })} /></label>
            <label className="sm:col-span-2">Thư mục NAS đồng bộ (tuỳ chọn)<input className={inp} value={v.syncFolder ?? ''} onChange={(e) => setV({ ...v, syncFolder: e.target.value || null })} placeholder="/volume1/tai-lieu" /></label>
          </div></details>
        {err && <p role="alert" className="font-medium text-red-700">{err}</p>}
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-slate-100">Huỷ</button><button disabled={save.isPending} onClick={submit} className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Đang tạo…' : 'Tạo'}</button></div>
      </div>
    </Modal>
  )
}
