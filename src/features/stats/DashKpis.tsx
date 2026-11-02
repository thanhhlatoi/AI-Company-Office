import { changePct } from '../../lib/money'
import { formatDuration } from '../../lib/time'
import { useMoney } from '../../lib/useMoney'
import type { StatsOverview } from '../../types/stats'
import { HelpTip } from '../projects/ProjectParts'

type Better = 'up' | 'down' | 'none' // chiều nào là TỐT: lỗi tăng là xấu, task xong tăng là tốt, chi phí chỉ hiển thị trung tính

/** Mũi tên + % đổi so với kỳ trước; màu theo ý nghĩa, luôn kèm chữ "tăng/giảm". */
function Delta({ now, prev, better, pp = false }: { now: number; prev?: number | null; better: Better; pp?: boolean }) {
  if (prev == null) return <span className="text-xs text-slate-600">Chưa có kỳ trước để so</span>
  const d = pp ? (now - prev) * 100 : changePct(now, prev)
  if (d == null) return <span className="text-xs text-slate-600">Kỳ trước bằng 0</span>
  const up = d > 0, same = Math.abs(d) < 0.05
  const good = better === 'none' || same ? null : (better === 'up') === up
  const color = good == null ? 'text-slate-700' : good ? 'text-green-800' : 'text-red-800'
  return <span className={`text-xs font-bold ${color}`}>{same ? '■ không đổi' : `${up ? '▲ tăng' : '▼ giảm'} ${Math.abs(d).toFixed(1)}${pp ? ' điểm %' : '%'}`}<span className="font-normal text-slate-600"> so với kỳ trước</span></span>
}

function Kpi({ label, tip, value, sub, delta }: { label: string; tip: string; value: string; sub?: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-3">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">{label}<HelpTip text={tip} /></dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
      {delta && <p className="mt-0.5">{delta}</p>}
    </div>
  )
}

/** Hàng thẻ KPI: mỗi số có tooltip "Tính thế nào?" ghi đúng định nghĩa. */
export function DashKpis({ s }: { s: StatsOverview }) {
  const money = useMoney()
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi label="Task hoàn thành" tip="Số task có trạng thái XONG và kết thúc trong khoảng đã chọn." value={s.completed.value.toLocaleString('vi-VN')} delta={<Delta now={s.completed.value} prev={s.completed.prev} better="up" />} />
      <Kpi label="Thời gian xử lý (trung vị)" tip="Trung vị thời gian từ lúc bắt đầu chạy tới lúc xong của các task XONG. P90: 90% task xong trong thời gian này hoặc ít hơn." value={formatDuration(s.medianSec.value * 1000)} sub={s.p90Sec != null ? `P90: ${formatDuration(s.p90Sec * 1000)}` : undefined} delta={<Delta now={s.medianSec.value} prev={s.medianSec.prev} better="down" />} />
      <Kpi label="Tỉ lệ lỗi" tip="Task lỗi hẳn (hết số lần thử) / (task xong + task lỗi hẳn) kết thúc trong khoảng. 'Thành công sau thử lại' = task phải thử nhiều lần nhưng cuối cùng xong / tất cả task đã thử lại." value={`${(s.errorRate.value * 100).toFixed(1)}%`} sub={s.recoveredRate != null ? `${(s.recoveredRate * 100).toFixed(0)}% thành công sau thử lại` : undefined} delta={<Delta now={s.errorRate.value} prev={s.errorRate.prev} better="down" pp />} />
      <Kpi label="Chi phí" tip="Tổng chi phí các cuộc gọi mô hình của task kết thúc trong khoảng (đã tính giá; cuộc gọi chưa có giá chưa được tính)." value={money(s.cost.value)} delta={<Delta now={s.cost.value} prev={s.cost.prev} better="none" />} />
      <Kpi label="Đang chạy / Chờ / Chờ duyệt" tip="Ảnh chụp lúc này (không phụ thuộc khoảng thời gian): task đang chạy, đang xếp hàng (gồm chờ ngân sách) và đang chờ bạn duyệt." value={`${s.running} / ${s.queued} / ${s.awaiting}`} />
    </dl>
  )
}
