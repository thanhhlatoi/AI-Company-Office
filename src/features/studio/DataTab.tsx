import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SensitivityBadge } from '../../components/studio/badges'
import type { Agent } from '../../types'
import type { Access } from '../../types/knowledge'
import type { StudioConfig } from '../../types/studio'
import { ACCESS_LABEL } from '../knowledge/access'
import { useSaveStudioData } from '../knowledge/mutations'
import { useSavePolicy } from './mutations'
import { useCollections, useModelPolicy, useNamespaces, useStudio } from './queries'

const sel = 'rounded-lg border border-slate-300 px-2 py-1 text-sm'
type Draft = Pick<StudioConfig, 'memoryPolicy' | 'collections' | 'namespaces'>
const of = (c: StudioConfig): Draft => ({ memoryPolicy: c.memoryPolicy, collections: c.collections, namespaces: c.namespaces })

/** Tab "Dữ liệu": quyền của agent với kho tài liệu và bộ nhớ + chính sách bộ nhớ. */
export function DataTab({ agent }: { agent: Agent }) {
  const cfg = useStudio(agent.id), cols = useCollections(), ns = useNamespaces()
  if (cfg.isLoading || cols.isLoading || ns.isLoading) return <div className="h-48 animate-pulse rounded-card bg-slate-200" />
  if (cfg.isError || cols.isError || ns.isError || !cfg.data) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được cấu hình dữ liệu. <button className="underline" onClick={() => { void cfg.refetch(); void cols.refetch(); void ns.refetch() }}>Thử lại</button></p>
  return <Editor key={JSON.stringify(of(cfg.data))} agent={agent} saved={cfg.data} />
}

function Editor({ agent, saved }: { agent: Agent; saved: StudioConfig }) {
  const cols = useCollections().data ?? [], nss = useNamespaces().data ?? [], policy = useModelPolicy(agent.id).data
  const [d, setD] = useState<Draft>(of(saved))
  const save = useSaveStudioData(agent.id), setPolicy = useSavePolicy(agent.id)
  const accessOf = (id: string) => d.collections.find((c) => c.collectionId === id)?.access ?? 'NONE'
  const nsAccess = (id: string) => d.namespaces.find((c) => c.namespaceId === id)?.access ?? 'NONE'
  const setCol = (id: string, access: Access) => setD({ ...d, collections: [...d.collections.filter((c) => c.collectionId !== id), { collectionId: id, access }] })
  const setNs = (id: string, access: Access) => setD({ ...d, namespaces: [...d.namespaces.filter((c) => c.namespaceId !== id), ...(access === 'NONE' ? [] : [{ namespaceId: id, access }])] })
  const mp = d.memoryPolicy, setMp = (p: Partial<typeof mp>) => setD({ ...d, memoryPolicy: { ...mp, ...p } })
  const secret = cols.filter((c) => c.sensitivity === 'CONFIDENTIAL' && accessOf(c.id) !== 'NONE')
  const dirty = JSON.stringify(d) !== JSON.stringify(of(saved))
  return (
    <div className="space-y-6">
      <section aria-label="Kho tài liệu" className="space-y-2"><h3 className="text-sm font-semibold">Kho tài liệu</h3>
        {cols.length === 0 ? <p className="text-sm text-slate-700">Chưa có bộ sưu tập nào. <Link to="/knowledge" className="underline">Tạo ở Kho tài liệu</Link></p> : (
          <table className="w-full text-sm"><thead className="text-left"><tr><th scope="col" className="p-1">Bộ sưu tập</th><th scope="col" className="p-1">Độ nhạy</th><th scope="col" className="p-1">Quyền của agent</th></tr></thead>
            <tbody>{cols.map((c) => <tr key={c.id} className="border-t border-slate-100"><th scope="row" className="p-1 text-left font-medium"><Link to={`/knowledge/${c.id}`} className="underline">{c.name}</Link></th><td className="p-1"><SensitivityBadge value={c.sensitivity} /></td>
              <td className="p-1"><select aria-label={`Quyền với ${c.name}`} className={sel} value={accessOf(c.id)} onChange={(e) => setCol(c.id, e.target.value as Access)}>{(['NONE', 'READ', 'WRITE'] as const).map((a) => <option key={a} value={a}>{ACCESS_LABEL[a]}</option>)}</select></td></tr>)}</tbody></table>
        )}
        {secret.length > 0 && policy?.privacy === 'ANY' && (
          <p role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 p-2 text-sm text-orange-950"><TriangleAlert size={16} className="shrink-0" aria-hidden />
            <span className="flex-1">Agent được cấp dữ liệu MẬT ({secret.map((c) => c.name).join(', ')}) nhưng chế độ riêng tư đang là “Bất kỳ”: nội dung có thể bị gửi tới model CLOUD. Nên chuyển sang “Chỉ local”.</span>
            <button disabled={setPolicy.isPending} onClick={() => setPolicy.mutate({ primaryId: policy.primaryId, fallbackIds: policy.fallbackIds, escalationId: policy.escalationId ?? null, routing: policy.routing, privacy: 'LOCAL_ONLY' })} className="rounded-lg border border-orange-700 px-3 py-1 font-medium hover:bg-orange-100 disabled:opacity-50">Bật “Chỉ local”</button></p>
        )}
      </section>
      <section aria-label="Không gian tên bộ nhớ" className="space-y-2"><h3 className="text-sm font-semibold">Bộ nhớ</h3>
        <table className="w-full text-sm"><thead className="text-left"><tr><th scope="col" className="p-1">Không gian tên</th><th scope="col" className="p-1">Chờ xem xét</th><th scope="col" className="p-1">Quyền của agent</th></tr></thead>
          <tbody>{nss.map((n) => <tr key={n.id} className="border-t border-slate-100"><th scope="row" className="p-1 text-left font-medium">{n.name}</th><td className="p-1">{n.pendingCount}</td>
            <td className="p-1"><select aria-label={`Quyền với ${n.name}`} className={sel} value={nsAccess(n.id)} onChange={(e) => setNs(n.id, e.target.value as Access)}>{(['NONE', 'READ', 'WRITE'] as const).map((a) => <option key={a} value={a}>{ACCESS_LABEL[a]}</option>)}</select></td></tr>)}</tbody></table>
      </section>
      <fieldset className="space-y-2 rounded-card border border-slate-200 p-3 text-sm"><legend className="px-1 font-semibold">Chính sách bộ nhớ</legend>
        <label className="flex items-center gap-2"><input type="checkbox" checked={mp.enabled} onChange={(e) => setMp({ enabled: e.target.checked })} />Bật bộ nhớ cho agent này</label>
        <label className="flex items-center gap-2">Tự nạp đầu task<input type="number" min={0} max={50} disabled={!mp.enabled} value={mp.autoLoad} onChange={(e) => setMp({ autoLoad: Math.max(0, Math.floor(Number(e.target.value))) })} className="w-20 rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50" />mục</label>
        <label className="flex items-start gap-2"><input type="checkbox" disabled={!mp.enabled} className="mt-1" checked={mp.autoSummarize} onChange={(e) => setMp({ autoSummarize: e.target.checked })} /><span>Tự tóm tắt cuối task<span className="block text-xs font-semibold text-amber-900">Có chi phí: mỗi task thêm một lần gọi model.</span></span></label>
        <label className="flex items-center gap-2"><input type="checkbox" disabled={!mp.enabled} checked={mp.requireReview} onChange={(e) => setMp({ requireReview: e.target.checked })} />Yêu cầu xem xét khi agent ghi ký ức mới</label>
      </fieldset>
      <div className="flex gap-2"><button disabled={!dirty || save.isPending} onClick={() => save.mutate(d)} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Đang lưu…' : 'Lưu cấu hình dữ liệu'}</button>{dirty && <button onClick={() => setD(of(saved))} className="text-sm underline">Bỏ thay đổi</button>}</div>
    </div>
  )
}
