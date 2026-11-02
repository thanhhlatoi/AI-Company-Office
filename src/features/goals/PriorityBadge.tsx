import type { Priority } from '../../types'
import { PRIORITY_STYLE } from './style'

export function PriorityBadge({ priority }: { priority: Priority }) {
  const p = PRIORITY_STYLE[priority]
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: p.soft, color: p.color }} title={`Ưu tiên ${p.label.toLowerCase()}`}>
      <span aria-hidden="true">{p.mark}</span>{p.label}
    </span>
  )
}
