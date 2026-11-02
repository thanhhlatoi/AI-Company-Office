import { Link } from 'react-router-dom'
import type { Agent } from '../../types'
import { BudgetGauge } from './BudgetGauge'
import { useBudgets } from './hooks'

/** Trong panel agent: thanh ngân sách (theo ngày) của chính agent, và ngân sách khác đang chặn agent này. */
export function AgentBudget({ agent }: { agent: Agent }) {
  const list = useBudgets().data ?? []
  const own = list.find((b) => b.scopeType === 'AGENT' && b.scopeId === agent.id && b.period === 'DAY')
  const blocking = list.filter((b) => b.mode === 'BLOCK' && b.state === 'HARD' && b.id !== own?.id && (b.scopeType === 'COMPANY' || (b.scopeType === 'DEPARTMENT' && b.scopeId === agent.departmentId)))
  if (!own && blocking.length === 0) return null
  return (
    <section aria-label="Ngân sách của agent" className="space-y-2 rounded-card border border-slate-200 p-3">
      <h3 className="text-sm font-semibold">Ngân sách ngày</h3>
      {own ? <BudgetGauge b={own} /> : <p className="text-xs text-slate-600">Agent chưa có ngân sách riêng.</p>}
      {[own, ...blocking].some((b) => b?.mode === 'BLOCK' && b.state === 'HARD') && <p role="status" className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-800">Hết ngân sách: việc mới của agent này đang chờ. {blocking.map((b) => <span key={b.id} className="font-normal">({b.scopeLabel}) </span>)}<Link to="/costs" className="font-normal underline">Mở trang chi phí</Link></p>}
    </section>
  )
}
