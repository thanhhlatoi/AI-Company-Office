import { Globe, Eye, UserCheck } from 'lucide-react'
import type { MemoryOrigin } from '../../types/memory'
import { ORIGIN_STYLE } from './style'

const ICON = { OWNER: UserCheck, AGENT_OBSERVED: Eye, EXTERNAL_INFERRED: Globe } as const

/** Nguồn gốc ký ức: biểu tượng + chữ + màu */
export function OriginBadge({ origin }: { origin: MemoryOrigin }) {
  const s = ORIGIN_STYLE[origin], Icon = ICON[origin]
  return <span title={s.hint} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: s.color, background: s.soft }}><Icon size={12} aria-hidden />{s.label}</span>
}
