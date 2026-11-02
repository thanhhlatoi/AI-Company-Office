import { changePct } from '../../lib/money'
import { useMoney } from '../../lib/useMoney'
import type { UsageSummary } from '../../types/cost'

const nf = (n: number) => n.toLocaleString('vi-VN')

function Kpi({ label, value, note }: { label: string; value: string; note?: React.ReactNode }) {
  return <div className="rounded-card border border-slate-200 bg-white p-3"><dt className="text-xs font-medium text-slate-600">{label}</dt><dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>{note && <p className="mt-0.5 text-xs">{note}</p>}</div>
}

/** Thẻ tổng: chi phí kỳ này (so kỳ trước), cuộc gọi, token vào/ra, chi phí trung bình mỗi task. */
export function CostKpis({ u }: { u: UsageSummary }) {
  const money = useMoney()
  const pct = u.prevTotalMicro == null ? null : changePct(u.totalMicro, u.prevTotalMicro)
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi label="Chi phí kỳ này" value={money(u.totalMicro)} note={pct == null ? <span className="text-slate-600">Chưa có kỳ trước để so</span> : (
        // chi phí TĂNG là xấu: đỏ; giảm: xanh. Luôn kèm mũi tên và chữ
        <span className={`font-bold ${pct > 0 ? 'text-red-700' : 'text-green-700'}`}>{pct > 0 ? '▲ tăng' : pct < 0 ? '▼ giảm' : '■ không đổi'} {Math.abs(pct).toFixed(1)}% <span className="font-normal text-slate-600">so với kỳ trước ({money(u.prevTotalMicro ?? 0)})</span></span>)} />
      <Kpi label="Số cuộc gọi" value={nf(u.calls)} />
      <Kpi label="Token vào" value={nf(u.inputTokens)} />
      <Kpi label="Token ra" value={nf(u.outputTokens)} />
      <Kpi label="Trung bình mỗi task" value={u.avgPerTaskMicro == null ? '—' : money(u.avgPerTaskMicro)} />
    </dl>
  )
}
