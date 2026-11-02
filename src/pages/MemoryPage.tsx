import { Link, useSearchParams } from 'react-router-dom'
import { ListTab } from '../features/memory/ListTab'
import { ManageTab } from '../features/memory/ManageTab'
import { ReviewTab } from '../features/memory/ReviewTab'
import { usePendingMemory } from '../features/studio/queries'

export default function MemoryPage() {
  const [sp, setSp] = useSearchParams()
  const pending = usePendingMemory().data ?? 0
  const TABS = [['list', 'Danh sách'], ['review', `Chờ xem xét${pending ? ` (${pending})` : ''}`], ['manage', 'Quên, xuất và cấu hình']] as const
  const raw = sp.get('tab'), tab = TABS.some(([k]) => k === raw) ? (raw as 'list' | 'review' | 'manage') : 'list'
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <header className="mb-4"><h1 className="text-xl font-bold">Bộ nhớ</h1><p className="text-sm text-slate-700">Những gì agent nhớ giữa các task. Nội dung ký ức là dữ liệu không tin cậy nên luôn hiện dạng chữ. <Link className="underline" to="/knowledge">Kho tài liệu</Link> là nơi lưu tài liệu.</p></header>
      <div role="tablist" aria-label="Mục" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(([k, label]) => <button key={k} role="tab" id={`mem-${k}`} aria-selected={tab === k} aria-controls="mem-panel" onClick={() => setSp(k === 'list' ? {} : { tab: k }, { replace: true })} className={`shrink-0 border-b-2 px-3 py-2 text-sm ${tab === k ? 'border-brand font-semibold text-brand' : 'border-transparent text-slate-700'}`}>{label}</button>)}
      </div>
      <div id="mem-panel" role="tabpanel" aria-labelledby={`mem-${tab}`}>
        {tab === 'list' && <ListTab initialAgent={sp.get('agent') ?? ''} />}{tab === 'review' && <ReviewTab />}{tab === 'manage' && <ManageTab />}
      </div>
    </div>
  )
}
