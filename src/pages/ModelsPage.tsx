import { GitCompare } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConnectionsTab } from '../features/models/ConnectionsTab'
import { ProviderModels } from '../features/models/ProviderModels'
import { RosterTab } from '../features/models/RosterTab'
import { RulesTab } from '../features/models/RulesTab'

export default function ModelsPage() {
  const [sp, setSp] = useSearchParams()
  const tab = (['rules', 'roster'] as const).find((k) => k === sp.get('tab')) ?? 'profiles'
  const provider = tab === 'profiles' ? sp.get('provider') : null
  const openProvider = (name: string | null) => setSp((p) => { const n = new URLSearchParams(p); if (name) n.set('provider', name); else n.delete('provider'); return n }, { replace: true })
  return (
    <div className="flex h-full">
    <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Model</h1>
        <Link to="/models/compare" className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"><GitCompare size={14} aria-hidden />So sánh model</Link>
      </header>
      <div role="tablist" aria-label="Mục" className="mb-4 flex gap-1 border-b border-slate-200">
        {([['profiles', 'Hồ sơ model'], ['rules', 'Luật định tuyến'], ['roster', 'Bảng điều phối']] as const).map(([k, label]) => <button key={k} role="tab" id={`m-${k}`} aria-selected={tab === k} aria-controls="models-panel" onClick={() => setSp({ tab: k }, { replace: true })} className={`border-b-2 px-3 py-2 text-sm ${tab === k ? 'border-brand font-semibold text-brand' : 'border-transparent text-slate-700'}`}>{label}</button>)}
      </div>
      <div id="models-panel" role="tabpanel" aria-labelledby={`m-${tab}`}>
        {tab === 'rules' ? <RulesTab /> : tab === 'roster' ? <RosterTab /> : <ConnectionsTab open={provider} onOpen={openProvider} />}
      </div>
    </div>
    {provider && <ProviderModels key={provider} provider={provider} onClose={() => openProvider(null)} />}
    </div>
  )
}
