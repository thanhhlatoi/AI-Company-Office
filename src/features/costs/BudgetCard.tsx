import { useState } from 'react'
import { formatDateTime } from '../../lib/time'
import { useMoney } from '../../lib/useMoney'
import type { Budget } from '../../types/cost'
import { BudgetForm } from './BudgetForm'
import { BudgetGauge } from './BudgetGauge'
import { PERIOD_LABEL, SCOPE_LABEL, STATE_STYLE } from './budgetStyle'
import { useBudgetChanges } from './hooks'

/** Một ngân sách: thanh đo, trạng thái, chế độ, việc đang chờ; sửa và xem lịch sử thay đổi hạn mức. */
export function BudgetCard({ b }: { b: Budget }) {
  const money = useMoney()
  const [editing, setEditing] = useState(false), [showLog, setShowLog] = useState(false)
  const log = useBudgetChanges(b.id, showLog)
  const st = STATE_STYLE[b.state]
  return (
    <li className="rounded-card border-2 bg-white p-3" style={{ borderColor: b.state === 'OK' ? '#e2e8f0' : st.color }}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{b.scopeLabel}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{SCOPE_LABEL[b.scopeType]} · theo {PERIOD_LABEL[b.period]}</span>
        <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: st.color }}>{st.label}</span>
        <span className="text-xs text-slate-600">{b.mode === 'BLOCK' ? 'Chặn khi hết' : 'Chỉ cảnh báo'}</span>
        {b.waitingTasks > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">{b.waitingTasks} việc chờ ngân sách</span>}
        <span className="ml-auto flex gap-2 text-xs"><button onClick={() => setEditing(true)} className="rounded-lg border border-slate-300 px-2.5 py-1 hover:bg-slate-50">Sửa</button><button onClick={() => setShowLog(!showLog)} aria-expanded={showLog} className="rounded-lg px-2.5 py-1 text-brand underline">Lịch sử thay đổi</button></span>
      </div>
      <BudgetGauge b={b} />
      {showLog && (
        <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs">
          {log.isLoading && <p>Đang tải…</p>}
          {log.isError && <p role="alert" className="text-red-700">Không tải được lịch sử.</p>}
          {log.data?.length === 0 && <p className="text-slate-600">Chưa có thay đổi hạn mức.</p>}
          <ul className="space-y-1">{log.data?.map((c) => <li key={c.id}><time className="text-slate-600">{formatDateTime(c.at)}</time> · <b className="tabular-nums">{money(c.fromMicro)} → {money(c.toMicro)}</b> · {c.reason}</li>)}</ul>
        </div>
      )}
      {editing && <BudgetForm budget={b} onClose={() => setEditing(false)} />}
    </li>
  )
}
