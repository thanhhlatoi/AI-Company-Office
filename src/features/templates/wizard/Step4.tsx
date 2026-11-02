import { SensitivityBadge } from '../../../components/studio/badges'
import type { Access, Collection } from '../../../types/knowledge'
import type { MemoryNamespace } from '../../../types/memory'
import { ACCESS_LABEL } from '../../knowledge/access'
import type { Draft } from '../wizardLogic'

const sel = 'rounded-lg border border-slate-300 px-2 py-1 text-sm'
const OPTS = ['NONE', 'READ', 'WRITE'] as const

/** Bước 4: bộ sưu tập kho được đọc, không gian tên bộ nhớ, chính sách bộ nhớ, ngân sách ngày. */
export function Step4({ d, set, cols, nss }: { d: Draft; set: (p: Partial<Draft>) => void; cols: Collection[]; nss: MemoryNamespace[] }) {
  const secret = cols.filter((c) => c.sensitivity === 'CONFIDENTIAL' && (d.collections[c.id] ?? 'NONE') !== 'NONE')
  const shared = nss.filter((n) => !n.agentId)
  return (
    <div className="space-y-5 text-sm">
      <section aria-label="Kho tài liệu" className="space-y-2"><h3 className="font-semibold">Bộ sưu tập kho được đọc</h3>
        {cols.length === 0 ? <p className="text-slate-700">Chưa có bộ sưu tập nào.</p> : <ul className="space-y-1.5">{cols.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-2"><span className="font-medium">{c.name}</span><SensitivityBadge value={c.sensitivity} /><select aria-label={`Quyền với ${c.name}`} className={`${sel} ml-auto`} value={d.collections[c.id] ?? 'NONE'} onChange={(e) => set({ collections: { ...d.collections, [c.id]: e.target.value as Access } })}>{OPTS.map((a) => <option key={a} value={a}>{ACCESS_LABEL[a]}</option>)}</select></li>)}</ul>}
        {secret.length > 0 && d.privacy === 'ANY' && <p role="alert" className="rounded-lg border border-orange-300 bg-orange-50 p-2 text-orange-950">Bạn cấp dữ liệu MẬT ({secret.map((c) => c.name).join(', ')}) nhưng chế độ riêng tư là “Bất kỳ”. Quay lại bước 2 và chọn “Chỉ local”.</p>}</section>
      <fieldset className="space-y-2 rounded-card border border-slate-200 p-3"><legend className="px-1 font-semibold">Bộ nhớ</legend>
        <label className="flex items-center gap-2"><input type="checkbox" checked={d.memory.enabled} onChange={(e) => set({ memory: { ...d.memory, enabled: e.target.checked } })} />Bật bộ nhớ (tạo không gian tên riêng cho agent)</label>
        {d.memory.enabled && <><label className="flex items-center gap-2"><input type="checkbox" checked={d.memory.requireReview} onChange={(e) => set({ memory: { ...d.memory, requireReview: e.target.checked } })} />Yêu cầu xem xét khi agent ghi ký ức mới</label>
          {shared.length > 0 && <div><p className="font-medium">Không gian tên chung được dùng thêm</p><ul className="mt-1 space-y-1">{shared.map((n) => <li key={n.id} className="flex items-center gap-2">{n.name}<select aria-label={`Quyền với ${n.name}`} className={`${sel} ml-auto`} value={d.namespaces[n.id] ?? 'NONE'} onChange={(e) => set({ namespaces: { ...d.namespaces, [n.id]: e.target.value as Access } })}>{OPTS.map((a) => <option key={a} value={a}>{ACCESS_LABEL[a]}</option>)}</select></li>)}</ul></div>}</>}</fieldset>
      <label className="block"><span className="font-semibold">Ngân sách ngày (USD, tuỳ chọn)</span><input type="number" min={0} step="any" value={d.budgetUsd} onChange={(e) => set({ budgetUsd: e.target.value })} className={`${sel} mt-1 block w-40`} placeholder="Không giới hạn" /><span className="text-xs text-slate-700">Hết ngân sách thì việc mới của agent chờ cho tới khi bạn tăng hạn mức.</span></label>
    </div>
  )
}
