import { X } from 'lucide-react'
import { useState } from 'react'
import { PANEL_CLASS } from '../../components/panelStyles'
import { useAgentStore } from '../../store/agentStore'
import { AgentConversations } from '../history/AgentConversations'
import { AgentQueue } from '../queue/AgentQueue'
import { GoalForm } from '../departments/GoalForm'
import { AssignTab } from '../tasks/AssignTab'
import { HistoryTab } from '../tasks/HistoryTab'
import { ChannelsTab } from './ChannelsTab'
import { EventLogTab } from './EventLogTab'
import { OverviewTab } from './OverviewTab'
import { SkillsTab } from './SkillsTab'

const BASE_TABS = [
  ['overview', 'Tổng quan'],
  ['assign', 'Giao việc'],
  ['queue', 'Hàng đợi'],
  ['history', 'Lịch sử'],
  ['conversations', 'Hội thoại'],
  ['skills', 'Skill'],
  ['channels', 'Kênh'],
  ['log', 'Nhật ký'],
] as const
type Tab = (typeof BASE_TABS)[number][0] | 'goal'

/** Panel phải (>=1024px) / bottom sheet (<1024px). */
export function AgentPanel({ onClose }: { onClose: () => void }) {
  const id = useAgentStore((s) => s.selectedAgentId)
  const agent = useAgentStore((s) => (s.selectedAgentId ? s.agentsById[s.selectedAgentId] : undefined))
  const [tab, setTab] = useState<Tab>('overview')
  if (!id || !agent) return null
  // Trưởng phòng có thêm tab giao mục tiêu cho cả phòng
  const tabs: readonly (readonly [Tab, string])[] = agent.isHead && agent.departmentId ? [...BASE_TABS, ['goal', 'Mục tiêu phòng']] : BASE_TABS

  return (
    <aside
      aria-label={`Chi tiết ${agent.name}`}
      className={PANEL_CLASS}
    >
      <div className="flex items-center border-b border-slate-200 px-2">
        <div role="tablist" className="flex flex-1 overflow-x-auto">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              title={key === 'goal' ? 'Giao mục tiêu cho cả phòng' : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm ${tab === key ? 'border-brand font-medium text-brand' : 'border-transparent text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button aria-label="Đóng panel" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'overview' && <OverviewTab agent={agent} onDeleted={onClose} />}
        {tab === 'assign' && <AssignTab agentId={id} onDone={() => setTab('history')} />}
        {tab === 'queue' && <AgentQueue agentId={id} />}
        {tab === 'conversations' && <AgentConversations agentId={id} />}
        {tab === 'history' && <HistoryTab agentId={id} />}
        {tab === 'skills' && <SkillsTab agentId={id} />}
        {tab === 'channels' && <ChannelsTab agentId={id} />}
        {tab === 'log' && <EventLogTab agentId={id} />}
        {tab === 'goal' && agent.departmentId && <GoalForm departmentId={agent.departmentId} />}
      </div>
    </aside>
  )
}
