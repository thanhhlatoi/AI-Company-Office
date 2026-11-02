import { Ban, Banknote, Building2, CircleCheck, Cloud, Cpu, Eye, Flame, Globe, Hourglass, Lock, PenLine, Send, type LucideIcon } from 'lucide-react'
import { DATACLASS_STYLE, DECISION_STYLE, HEALTH_STYLE, RISK_STYLE, SENSITIVITY_STYLE } from '../../features/studio/risk'
import type { Sensitivity } from '../../types/knowledge'
import type { DataClass, Health } from '../../types/models'
import type { Decision, RiskLevel } from '../../types/tools'

const RISK_ICON: Record<RiskLevel, LucideIcon> = { READ: Eye, WRITE_INTERNAL: PenLine, EXTERNAL: Send, MONEY: Banknote, DESTRUCTIVE: Flame }
const SENS_ICON: Record<Sensitivity, LucideIcon> = { PUBLIC: Globe, INTERNAL: Building2, CONFIDENTIAL: Lock }
const CHIP = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold'

/** Biểu tượng + chữ + màu (không chỉ màu). `compact`: chỉ biểu tượng, chữ nằm trong aria-label/title. */
export function RiskChip({ risk, compact = false }: { risk: RiskLevel; compact?: boolean }) {
  const s = RISK_STYLE[risk], Icon = RISK_ICON[risk]
  return (
    <span className={CHIP} style={{ color: s.color, background: s.soft, fontWeight: risk === 'DESTRUCTIVE' ? 800 : undefined }} title={s.hint} aria-label={`Rủi ro: ${s.label}`}>
      <Icon size={12} aria-hidden />{!compact && s.label}
    </span>
  )
}

export function SensitivityBadge({ value }: { value: Sensitivity }) {
  const s = SENSITIVITY_STYLE[value], Icon = SENS_ICON[value]
  return <span className={CHIP} style={{ color: s.color, background: s.soft }} aria-label={`Độ nhạy: ${s.label}`}><Icon size={12} aria-hidden />{s.label}</span>
}

/** Nhãn LOCAL / CLOUD của model */
export function DataClassBadge({ value }: { value: DataClass }) {
  const s = DATACLASS_STYLE[value], Icon = value === 'LOCAL' ? Cpu : Cloud
  return <span className={CHIP} style={{ color: s.color, background: s.soft }} title={s.hint}><Icon size={12} aria-hidden />{s.label}</span>
}

/** Chấm sức khoẻ + chữ */
export function HealthDot({ status }: { status: Health['status'] }) {
  const s = HEALTH_STYLE[status]
  return <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: s.color }}><span aria-hidden className="inline-block size-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
}

const DECISION_ICON: Record<Decision, LucideIcon> = { ALLOWED: CircleCheck, DENIED: Ban, NEEDS_APPROVAL: Hourglass }
/** Quyết định của một lời gọi công cụ: biểu tượng + chữ + màu */
export function DecisionChip({ value }: { value: Decision }) {
  const s = DECISION_STYLE[value], Icon = DECISION_ICON[value]
  return <span className={CHIP} style={{ color: s.color, background: s.soft }}><Icon size={12} aria-hidden />{s.label}</span>
}
