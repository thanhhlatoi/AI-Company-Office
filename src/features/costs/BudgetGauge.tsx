import { useMoney } from '../../lib/useMoney'
import type { Budget } from '../../types/cost'
import { PERIOD_LABEL, STATE_STYLE } from './budgetStyle'

/** Thanh đo: đã dùng + đang đặt chỗ (sọc) + còn lại, vạch đứng ở ngưỡng cảnh báo. */
export function BudgetGauge({ b }: { b: Budget }) {
  const money = useMoney()
  const st = STATE_STYLE[b.state]
  const usedPct = (b.usedMicro / b.limitMicro) * 100, resPct = (b.reservedMicro / b.limitMicro) * 100
  const left = Math.max(0, b.limitMicro - b.usedMicro - b.reservedMicro)
  return (
    <div>
      <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-xs">
        <span>Đã dùng <b className="tabular-nums">{money(b.usedMicro)}</b>{b.reservedMicro > 0 && <> · đặt chỗ <b className="tabular-nums">{money(b.reservedMicro)}</b></>} · còn <b className="tabular-nums">{money(left)}</b></span>
        <span>Hạn mức {PERIOD_LABEL[b.period]} <b className="tabular-nums">{money(b.limitMicro)}</b></span>
      </div>
      <div role="progressbar" aria-label={`Ngân sách ${b.scopeLabel}: ${st.label}`} aria-valuenow={Math.round(usedPct + resPct)} aria-valuemin={0} aria-valuemax={100} className="relative flex h-3.5 overflow-hidden rounded-full bg-slate-200">
        <div style={{ width: `${Math.min(100, usedPct)}%`, background: st.color }} />
        <div style={{ width: `${Math.min(100 - Math.min(100, usedPct), resPct)}%`, background: `repeating-linear-gradient(45deg, ${st.color} 0 3px, #ffffff 3px 6px)` }} />
        <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-slate-900" style={{ left: `${b.warnPct}%` }} title={`Ngưỡng cảnh báo ${b.warnPct}%`} />
      </div>
      <p className="mt-1 text-xs font-bold" style={{ color: st.color }}>{st.label} · {Math.round(usedPct + resPct)}% (cảnh báo từ {b.warnPct}%)</p>
    </div>
  )
}
