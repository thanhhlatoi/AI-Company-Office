import { useEffect, useRef } from 'react'
import { formatDateTime } from '../../lib/time'
import { useRealtimeStore } from '../../store/realtimeStore'
import type { AgentEvent } from '../../types'

const NONE: AgentEvent[] = [] // tham chiếu ổn định để selector không render vô hạn

export function EventLogTab({ agentId }: { agentId: string }) {
  const events = useRealtimeStore((s) => s.eventsByAgent[agentId] ?? NONE)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [events])
  if (!events.length) return <p className="text-sm text-slate-600">Chưa có sự kiện nào kể từ khi mở trang.</p>
  return (
    <ul className="space-y-1 font-mono text-xs">
      {events.map((e) => (
        <li key={e.id}><span className="text-slate-600">{formatDateTime(e.createdAt)}</span> {e.message}</li>
      ))}
      <div ref={endRef} />
    </ul>
  )
}
