import { useRef, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBanner } from '../components/ErrorBanner'
import { Banners } from '../features/settingsAi/Banners'
import { describeError } from '../features/settingsAi/errors'
import { useSettingsAi } from '../features/settingsAi/hooks'
import { GraphifyTab } from '../features/settingsAi/GraphifyTab'
import { HermesTab } from '../features/settingsAi/HermesTab'
import { OllamaTab } from '../features/settingsAi/OllamaTab'
import { OmniRouteTab } from '../features/settingsAi/OmniRouteTab'
import { OverviewTab } from '../features/settingsAi/OverviewTab'
import { RoutingTab } from '../features/settingsAi/RoutingTab'
import { SaveBar } from '../features/settingsAi/SaveBar'
import { useDraft } from '../features/settingsAi/useDraft'
import type { SettingsAi } from '../types/settingsAi'

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'ollama', label: 'Ollama' },
  { id: 'omniroute', label: 'OmniRoute' },
  { id: 'hermes', label: 'Hermes' },
  { id: 'routing', label: 'Định tuyến' },
  { id: 'graphify', label: 'Graphify' },
] as const
type TabId = (typeof TABS)[number]['id']

/** Phần có dữ liệu: nháp chung cho mọi tab (đổi tab không mất chỉnh sửa), một thanh Lưu chung. */
function Body({ s }: { s: SettingsAi }) {
  const [sp, setSp] = useSearchParams()
  const f = useDraft(s)
  const tab = (TABS.find((t) => t.id === sp.get('tab'))?.id ?? 'overview') as TabId
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const go = (id: TabId) => { const n = new URLSearchParams(sp); n.set('tab', id); setSp(n, { replace: true }); refs.current[id]?.focus() }
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (d) { e.preventDefault(); go(TABS[(i + d + TABS.length) % TABS.length].id) }
    else if (e.key === 'Home') { e.preventDefault(); go(TABS[0].id) }
    else if (e.key === 'End') { e.preventDefault(); go(TABS[TABS.length - 1].id) }
  }
  return (
    <>
      <Banners s={s} />
      <div role="tablist" aria-label="Mục cài đặt AI" className="flex flex-col gap-1 border-slate-200 sm:flex-row sm:border-b">
        {TABS.map((t, i) => (
          <button
            key={t.id} ref={(el) => { refs.current[t.id] = el }} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="tab-panel"
            tabIndex={tab === t.id ? 0 : -1} onClick={() => go(t.id)} onKeyDown={(e) => onKey(e, i)}
            className={`rounded-lg px-4 py-2 text-left text-sm font-medium sm:rounded-b-none sm:border-b-2 ${tab === t.id ? 'bg-brand/10 text-brand sm:border-brand' : 'text-slate-700 hover:bg-slate-100 sm:border-transparent'}`}
          >{t.label}</button>
        ))}
      </div>
      <div role="tabpanel" id="tab-panel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'overview' && <OverviewTab s={s} goTab={go} />}
        {tab === 'ollama' && <OllamaTab f={f} />}
        {tab === 'omniroute' && <OmniRouteTab s={s} f={f} />}
        {tab === 'hermes' && <HermesTab s={s} f={f} />}
        {tab === 'routing' && <RoutingTab f={f} />}
        {tab === 'graphify' && <GraphifyTab f={f} />}
      </div>
      <SaveBar f={f} />
    </>
  )
}

/** /settings/ai — cấu hình đường đi của AI (Ollama, OmniRoute, định tuyến, Graphify). Tab theo URL ?tab=. */
export default function SettingsAiPage() {
  const q = useSettingsAi()
  const err = q.isError ? describeError(q.error) : null
  return (
    <div className="mx-auto h-full max-w-5xl space-y-4 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24">
      <header>
        <Link to="/company" className="text-sm text-brand underline">← Về văn phòng</Link>
        <h1 className="mt-1 text-2xl font-bold">Cài đặt AI</h1>
      </header>
      {err && <ErrorBanner message={`${err.message}${err.requestId ? ` (mã tra log: ${err.requestId})` : ''}`} onRetry={() => void q.refetch()} />}
      {q.isLoading && <div className="space-y-3" aria-busy="true">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-card bg-slate-200 motion-reduce:animate-none" />)}</div>}
      {q.data && <Body s={q.data} />}
    </div>
  )
}
