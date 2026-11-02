import { KeyRound } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuditTab } from '../features/tools/AuditTab'
import { CatalogTab } from '../features/tools/CatalogTab'
import { DeniedTab } from '../features/tools/DeniedTab'
import { MatrixTab } from '../features/tools/MatrixTab'

const TABS = [['catalog', 'Danh mục công cụ'], ['matrix', 'Ma trận quyền'], ['denied', 'Bị từ chối'], ['audit', 'Nhật ký thay đổi']] as const
type Tab = (typeof TABS)[number][0]

export default function ToolsPage() {
  const [sp, setSp] = useSearchParams()
  const raw = sp.get('tab'), tab: Tab = TABS.some(([k]) => k === raw) ? (raw as Tab) : 'catalog'
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Công cụ và quyền</h1>
        <Link to="/settings/secrets" className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"><KeyRound size={14} aria-hidden />Quản lý bí mật</Link>
      </header>
      <div role="tablist" aria-label="Mục" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(([k, label]) => <button key={k} role="tab" id={`t-${k}`} aria-selected={tab === k} aria-controls="tools-panel" onClick={() => setSp({ tab: k }, { replace: true })} className={`shrink-0 border-b-2 px-3 py-2 text-sm ${tab === k ? 'border-brand font-semibold text-brand' : 'border-transparent text-slate-700'}`}>{label}</button>)}
      </div>
      <div id="tools-panel" role="tabpanel" aria-labelledby={`t-${tab}`}>
        {tab === 'catalog' && <CatalogTab />}{tab === 'matrix' && <MatrixTab />}{tab === 'denied' && <DeniedTab />}{tab === 'audit' && <AuditTab />}
      </div>
    </div>
  )
}
