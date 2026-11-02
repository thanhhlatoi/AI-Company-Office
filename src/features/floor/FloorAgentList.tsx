import { useAgentStore } from '../../store/agentStore'
import { STATUS_STYLE, statusLabel } from '../../lib/statusColors'

/**
 * Bản chữ của canvas: mọi agent trên tầng. Tab đi qua từng agent, Enter/Space chọn (mở panel) và camera bay tới.
 * Không phụ thuộc chuột trên canvas.
 */
export function FloorAgentList({ agentIds, onFocus }: { agentIds: string[]; onFocus: (id: string) => void }) {
  const agents = useAgentStore((s) => s.agentsById)
  const selected = useAgentStore((s) => s.selectedAgentId)
  const list = agentIds.map((id) => agents[id]).filter(Boolean)
  return (
    <aside aria-label="Danh sách agent trên tầng" className="w-64 shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
      <h2 className="sticky top-0 border-b border-slate-100 bg-white px-3 py-2 text-sm font-medium">Agent trên tầng ({list.length})</h2>
      <ul>
        {list.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => { useAgentStore.getState().select(a.id); onFocus(a.id) }}
              aria-current={selected === a.id ? 'true' : undefined}
              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${selected === a.id ? 'bg-brand/10' : ''}`}
            >
              <span className="font-medium">{a.name}{a.isHead ? ' ★' : ''} <span className="font-normal text-slate-500">· {a.role}</span></span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: STATUS_STYLE[a.status].color }}>
                <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: STATUS_STYLE[a.status].color }} />
                {statusLabel(a.status, a.currentTask)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
