import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { formatUsd } from '../../lib/money'
import { CollectionInputSchema, type Collection, type CollectionInput } from '../../types/knowledge'
import { useEmbeddingModels } from '../studio/queries'
import { AclEditor } from './AclEditor'
import { useReindex, useSaveCollection, useSyncFolder } from './mutations'

const inp = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
const RANK = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2 } as const
const toInput = (c: Collection): CollectionInput => ({ name: c.name, description: c.description, sensitivity: c.sensitivity, scope: { kind: c.scope.kind, id: c.scope.id ?? null }, embeddingModelId: c.embeddingModel.id, chunking: c.chunking, acl: c.acl.map((e) => ({ ...e, id: e.id ?? null })), syncFolder: c.syncFolder ?? null })

/** Quyền (ACL), độ nhạy, dựng lại chỉ mục khi đổi model embedding, đồng bộ thư mục NAS. */
export function SettingsTab({ c }: { c: Collection }) {
  const [v, setV] = useState<CollectionInput>(toInput(c)), [err, setErr] = useState(''), [ask, setAsk] = useState<'loosen' | 'reindex' | null>(null), [newEmb, setNewEmb] = useState('')
  const save = useSaveCollection(c.id), reindex = useReindex(c.id), sync = useSyncFolder(c.id), embs = useEmbeddingModels().data ?? []
  const dirty = JSON.stringify(v) !== JSON.stringify(toInput(c)), loosening = RANK[v.sensitivity] < RANK[c.sensitivity]
  const busy = c.indexState === 'REINDEXING'
  const targets = embs.filter((e) => e.id !== c.embeddingModel.id && (c.sensitivity !== 'CONFIDENTIAL' || e.dataClass === 'LOCAL'))
  const target = targets.find((e) => e.id === newEmb) ?? targets[0]
  const go = () => {
    const p = CollectionInputSchema.safeParse(v)
    if (!p.success) return setErr(p.error.issues[0].message)
    if (v.acl.some((e) => e.kind !== 'ALL' && !e.id)) return setErr('Còn mục quyền chưa chọn đối tượng')
    setErr(''); save.mutate(p.data, { onSuccess: () => setAsk(null) })
  }
  return (
    <div className="space-y-6">
      <section aria-label="Thông tin và quyền" className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2"><label>Tên<input className={inp} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
          <label>Độ nhạy<select className={inp} value={v.sensitivity} onChange={(e) => setV({ ...v, sensitivity: e.target.value as CollectionInput['sensitivity'] })}><option value="PUBLIC">Công khai</option><option value="INTERNAL">Nội bộ</option><option value="CONFIDENTIAL">Mật</option></select></label>
          <label className="sm:col-span-2">Mô tả<input className={inp} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></label></div>
        {v.sensitivity === 'CONFIDENTIAL' && c.embeddingModel.dataClass === 'CLOUD' && <p role="alert" className="flex gap-2 rounded-lg border border-orange-300 bg-orange-50 p-2 text-orange-950"><TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />Dữ liệu MẬT đang dùng model embedding CLOUD. Hãy đổi sang model LOCAL ở mục “Dựng lại chỉ mục” bên dưới (máy chủ sẽ từ chối lưu độ nhạy Mật cho tới khi đổi).</p>}
        <AclEditor acl={v.acl} onChange={(acl) => setV({ ...v, acl })} sensitivity={v.sensitivity} />
        <label className="block">Thư mục NAS đồng bộ (tuỳ chọn)<input className={inp} value={v.syncFolder ?? ''} onChange={(e) => setV({ ...v, syncFolder: e.target.value || null })} placeholder="/volume1/tai-lieu" /></label>
        {err && <p role="alert" className="font-medium text-red-700">{err}</p>}
        <div className="flex flex-wrap gap-2"><button disabled={!dirty || save.isPending} onClick={() => (loosening ? setAsk('loosen') : go())} className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
          {dirty && <button onClick={() => setV(toInput(c))} className="underline">Bỏ thay đổi</button>}
          {c.syncFolder && <button disabled={sync.isPending} onClick={() => sync.mutate()} className="ml-auto rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50 disabled:opacity-50">Đồng bộ thư mục ngay</button>}</div>
      </section>
      <section aria-label="Dựng lại chỉ mục" className="space-y-2 rounded-card border border-slate-200 p-3 text-sm">
        <h3 className="font-semibold">Dựng lại chỉ mục</h3>
        <p>Model embedding hiện tại: <b>{c.embeddingModel.label}</b> ({c.embeddingModel.dataClass}). Đổi model nghĩa là nhúng lại TOÀN BỘ {c.docCount} tài liệu: mất thời gian và (với model CLOUD) tốn tiền — lần nhúng trước hết {formatUsd(c.embeddingCostMicro)}.</p>
        {busy ? <div><div className="flex justify-between text-xs"><span>Đang dựng lại…</span><span>{c.reindexPct ?? 0}%</span></div><div role="progressbar" aria-label="Tiến độ dựng lại chỉ mục" aria-valuenow={c.reindexPct ?? 0} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-brand transition-all" style={{ width: `${c.reindexPct ?? 0}%` }} /></div></div>
          : targets.length === 0 ? <p className="text-slate-700">Không có model embedding nào khác phù hợp với độ nhạy này.</p>
          : <div className="flex flex-wrap items-center gap-2"><select aria-label="Model embedding mới" value={target?.id ?? ''} onChange={(e) => setNewEmb(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5">{targets.map((e) => <option key={e.id} value={e.id}>{e.label} — {e.dataClass}</option>)}</select><button onClick={() => setAsk('reindex')} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Đổi model và dựng lại</button></div>}
      </section>
      {ask === 'loosen' && <TwoStepConfirm title="Hạ độ nhạy?" confirmLabel="Vẫn lưu" busy={save.isPending} askReason={false} preview={<p className="text-sm">Bạn đang hạ độ nhạy từ <b>{c.sensitivity}</b> xuống <b>{v.sensitivity}</b>: dữ liệu sẽ được xử lý với ít ràng buộc riêng tư hơn (ví dụ được dùng model CLOUD).</p>} onClose={() => setAsk(null)} onConfirm={go} />}
      {ask === 'reindex' && target && <TwoStepConfirm title="Dựng lại toàn bộ chỉ mục?" confirmLabel="Dựng lại" busy={reindex.isPending} askReason={false} preview={<p className="text-sm">Nhúng lại {c.docCount} tài liệu bằng <b>{target.label}</b>. Tìm kiếm có thể kém chính xác cho tới khi xong.</p>} onClose={() => setAsk(null)} onConfirm={() => reindex.mutate(target.id, { onSuccess: () => setAsk(null) })} />}
    </div>
  )
}
