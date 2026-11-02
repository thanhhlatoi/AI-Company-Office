import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { CapabilityPanel } from '../features/studio/CapabilityPanel'
import { DataTab } from '../features/studio/DataTab'
import { ModelTab } from '../features/studio/ModelTab'
import { PromptEditor } from '../features/studio/PromptEditor'
import { PromptVersions } from '../features/studio/PromptVersions'
import { ProfileForm } from '../features/studio/ProfileForm'
import { TemplateDrift } from '../features/studio/TemplateDrift'
import { ToolLogTab } from '../features/studio/ToolLogTab'
import { ToolsTab } from '../features/studio/ToolsTab'
import type { EffectivePermissions } from '../types/tools'
import { useAgentsQuery } from '../features/agents/hooks'
import { useAgentStore } from '../store/agentStore'

const TABS = [
  ['profile', 'Hồ sơ và prompt'], ['model', 'Model'], ['tools', 'Công cụ và quyền'], ['data', 'Dữ liệu'], ['budget', 'Ngân sách'], ['log', 'Nhật ký công cụ'],
] as const
type Tab = (typeof TABS)[number][0]
const isTab = (s: string | null): s is Tab => TABS.some(([k]) => k === s)

export default function AgentStudioPage() {
  const { id = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const { isLoading } = useAgentsQuery()
  const agent = useAgentStore((s) => s.agentsById[id])
  const [preview, setPreview] = useState<EffectivePermissions | undefined>()
  const raw = sp.get('tab'), tab: Tab = isTab(raw) ? raw : 'profile'
  if (!agent) {
    return isLoading
      ? <div className="space-y-2 p-6">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-card bg-slate-200" />)}</div>
      : <div className="p-6"><h1 className="text-lg font-semibold">Không tìm thấy agent</h1><Link className="underline" to="/agents">Về danh sách agent</Link></div>
  }
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <Link to={`/agents`} aria-label="Về danh sách agent" className="rounded p-1 hover:bg-slate-100"><ArrowLeft size={18} /></Link>
        <Avatar name={agent.name} color={agent.color} />
        <div><h1 className="text-xl font-bold">Cấu hình: {agent.name}</h1><p className="text-sm text-slate-700">{agent.role}</p></div>
      </header>
      <div className="grid gap-4 lg:grid-cols-[11rem_minmax(0,1fr)_20rem]">
        <div role="tablist" aria-label="Mục cấu hình" aria-orientation="vertical" className="flex gap-1 overflow-x-auto lg:flex-col">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls="studio-panel" onClick={() => { setPreview(undefined); setSp({ tab: k }, { replace: true }) }}
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm ${tab === k ? 'bg-blue-50 font-semibold text-brand' : 'text-slate-700 hover:bg-slate-100'}`}>{label}</button>
          ))}
        </div>
        <div id="studio-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-w-0 space-y-5">
          {tab === 'profile' && <><TemplateDrift agent={agent} /><ProfileForm key={agent.id} agent={agent} /><PromptEditor key={agent.systemPrompt} agent={agent} /><PromptVersions agentId={agent.id} /></>}
          {tab === 'model' && <ModelTab agent={agent} />}
          {tab === 'tools' && <ToolsTab agent={agent} onPreview={setPreview} />}
          {tab === 'log' && <ToolLogTab agent={agent} />}
          {tab === 'data' && <DataTab agent={agent} />}
          {tab !== 'profile' && tab !== 'model' && tab !== 'tools' && tab !== 'log' && tab !== 'data' && <p className="rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-700">Mục “{TABS.find(([k]) => k === tab)?.[1]}” chưa có ở bước này.</p>}
        </div>
        <div className="min-w-0 rounded-card border border-slate-200 bg-white p-3 lg:sticky lg:top-0 lg:self-start"><CapabilityPanel agent={agent} preview={tab === 'tools' ? preview : undefined} /></div>
      </div>
    </div>
  )
}
