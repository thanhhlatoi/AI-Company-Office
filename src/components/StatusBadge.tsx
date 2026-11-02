import { STATUS_STYLE, statusLabel } from '../lib/statusColors'
import type { Agent } from '../types'

export function StatusBadge({ agent }: { agent: Pick<Agent, 'status' | 'currentTask'> }) {
  const s = STATUS_STYLE[agent.status]
  return (
    <span className="inline-block rounded-full px-3 py-0.5 text-sm font-medium" style={{ background: s.soft, color: s.color }}>
      {statusLabel(agent.status, agent.currentTask)}
    </span>
  )
}
