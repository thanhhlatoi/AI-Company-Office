import { GitCompare, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { ProfileCard } from '../features/models/ProfileCard'
import { ProfileForm } from '../features/models/ProfileForm'
import { RulesTab } from '../features/models/RulesTab'
import { ModelTester } from '../features/studio/ModelTester'
import { useModelProfiles } from '../features/studio/queries'
import type { ModelProfile } from '../types/models'

export default function ModelsPage() {
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') === 'rules' ? 'rules' : 'profiles'
  const q = useModelProfiles()
  const [form, setForm] = useState<{ model?: ModelProfile } | null>(null), [test, setTest] = useState<ModelProfile | null>(null)
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Model</h1>
        <div className="flex gap-2"><Link to="/models/compare" className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"><GitCompare size={14} aria-hidden />So sánh model</Link>
          <button onClick={() => setForm({})} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm text-white hover:bg-brand-dark"><Plus size={14} aria-hidden />Thêm hồ sơ</button></div>
      </header>
      <div role="tablist" aria-label="Mục" className="mb-4 flex gap-1 border-b border-slate-200">
        {([['profiles', 'Hồ sơ model'], ['rules', 'Luật định tuyến']] as const).map(([k, label]) => <button key={k} role="tab" id={`m-${k}`} aria-selected={tab === k} aria-controls="models-panel" onClick={() => setSp({ tab: k }, { replace: true })} className={`border-b-2 px-3 py-2 text-sm ${tab === k ? 'border-brand font-semibold text-brand' : 'border-transparent text-slate-700'}`}>{label}</button>)}
      </div>
      <div id="models-panel" role="tabpanel" aria-labelledby={`m-${tab}`}>
        {tab === 'rules' ? <RulesTab /> : q.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-card bg-slate-200" />)}</div>
          : q.isError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được hồ sơ model. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
          : !q.data?.length ? <p className="rounded-card border border-dashed border-slate-300 p-8 text-center text-sm text-slate-700">Chưa có hồ sơ model nào. Thêm hồ sơ đầu tiên để agent có model chạy.</p>
          : <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{q.data.map((m) => <ProfileCard key={m.id} m={m} onEdit={() => setForm({ model: m })} onTest={() => setTest(m)} />)}</ul>}
      </div>
      {form && <ProfileForm model={form.model} onClose={() => setForm(null)} />}
      {test && <Modal title={`Thử prompt: ${test.label}`} onClose={() => setTest(null)}><ModelTester models={q.data ?? []} defaultId={test.id} /></Modal>}
    </div>
  )
}
