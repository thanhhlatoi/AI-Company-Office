import { ArrowLeft } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { SensitivityBadge } from '../components/studio/badges'
import { ChunksTab } from '../features/knowledge/ChunksTab'
import { DocsTab } from '../features/knowledge/DocsTab'
import { EvalTab } from '../features/knowledge/EvalTab'
import { SearchTab } from '../features/knowledge/SearchTab'
import { SettingsTab } from '../features/knowledge/SettingsTab'
import { useCollections } from '../features/studio/queries'

const TABS = [['docs', 'Tài liệu'], ['chunks', 'Xem trước đoạn'], ['search', 'Tìm thử'], ['eval', 'Kiểm thử truy hồi'], ['settings', 'Quyền và cài đặt']] as const
type Tab = (typeof TABS)[number][0]

export default function CollectionPage() {
  const { id = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const q = useCollections(), c = q.data?.find((x) => x.id === id)
  const raw = sp.get('tab'), tab: Tab = TABS.some(([k]) => k === raw) ? (raw as Tab) : 'docs'
  if (q.isLoading) return <div className="space-y-2 p-6">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-card bg-slate-200" />)}</div>
  if (!c) return <div className="p-6"><h1 className="text-lg font-semibold">Không tìm thấy bộ sưu tập</h1><Link className="underline" to="/knowledge">Về Kho tài liệu</Link></div>
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center gap-3"><Link to="/knowledge" aria-label="Về Kho tài liệu" className="rounded p-1 hover:bg-slate-100"><ArrowLeft size={18} /></Link>
        <div><h1 className="text-xl font-bold">{c.name}</h1><p className="text-sm text-slate-700">{c.description}</p></div><SensitivityBadge value={c.sensitivity} /></header>
      <div role="tablist" aria-label="Mục" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(([k, label]) => <button key={k} role="tab" id={`c-${k}`} aria-selected={tab === k} aria-controls="col-panel" onClick={() => setSp({ tab: k }, { replace: true })} className={`shrink-0 border-b-2 px-3 py-2 text-sm ${tab === k ? 'border-brand font-semibold text-brand' : 'border-transparent text-slate-700'}`}>{label}</button>)}
      </div>
      <div id="col-panel" role="tabpanel" aria-labelledby={`c-${tab}`}>
        {tab === 'docs' && <DocsTab collectionId={c.id} />}{tab === 'chunks' && <ChunksTab collectionId={c.id} />}{tab === 'search' && <SearchTab collectionId={c.id} />}
        {tab === 'eval' && <EvalTab collectionId={c.id} />}{tab === 'settings' && <SettingsTab key={JSON.stringify(c)} c={c} />}
      </div>
    </div>
  )
}
