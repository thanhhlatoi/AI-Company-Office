import { memo, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMoney } from '../../lib/useMoney'
import type { StatsOverview } from '../../types/stats'
import { HelpTip } from '../projects/ProjectParts'
import { SERIES_COLORS } from './colors'
import { SeriesPattern, Swatch } from './palette'

const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
const FIG = 'rounded-card border border-slate-200 bg-white p-4'

/** Khung biểu đồ: tiêu đề + tooltip định nghĩa + mô tả cho trình đọc màn hình + bảng dữ liệu thay thế. */
function Card({ title, tip, label, empty, legend, table, children }: { title: string; tip: string; label: string; empty: boolean; legend?: { name: string; i: number }[]; table: [string, string][]; children: ReactNode }) {
  return (
    <figure className={FIG}>
      <figcaption className="mb-2 flex items-center gap-2 text-base font-semibold">{title}<HelpTip text={tip} /></figcaption>
      {empty ? <p className="grid h-48 place-items-center text-sm text-slate-600">Chưa đủ dữ liệu</p> : <div role="img" aria-label={label} className="h-56 w-full">{children}</div>}
      {legend && !empty && <ul className="mt-1 flex flex-wrap gap-x-4 text-xs">{legend.map((l) => <li key={l.name} className="flex items-center gap-1.5"><Swatch i={l.i} />{l.name}</li>)}</ul>}
      {!empty && <details className="mt-1 text-xs"><summary className="cursor-pointer text-slate-600">Xem dạng bảng</summary><table className="mt-1 text-left tabular-nums"><tbody>{table.map(([k, v]) => <tr key={k}><td className="pr-4">{k}</td><td>{v}</td></tr>)}</tbody></table></details>}
    </figure>
  )
}

type Props = { byDay: StatsOverview['byDay']; buckets: StatsOverview['durationBuckets']; costDept: StatsOverview['costByDepartment'] }

/** 4 biểu đồ của dashboard (nạp lười theo route). `memo`: dữ liệu không đổi thì không vẽ lại. */
function DashCharts({ byDay, buckets, costDept }: Props) {
  const money = useMoney()
  const rate = byDay.map((d) => ({ day: d.day, rate: d.completed + d.failed ? +((d.failed / (d.completed + d.failed)) * 100).toFixed(1) : null }))
  const none = (xs: number[]) => xs.every((x) => x === 0)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Task hoàn thành và lỗi theo ngày" tip="Mỗi cột là số task xong (xanh) và task lỗi hẳn (cam, gạch chéo) kết thúc trong ngày." label={`Task theo ngày: ${byDay.reduce((s, d) => s + d.completed, 0)} xong, ${byDay.reduce((s, d) => s + d.failed, 0)} lỗi`}
        empty={none(byDay.map((d) => d.completed + d.failed))} legend={[{ name: 'Xong', i: 0 }, { name: 'Lỗi', i: 3 }]} table={byDay.map((d) => [dm(d.day), `${d.completed} xong, ${d.failed} lỗi`])}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={byDay} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs><SeriesPattern id="dc-0" i={0} /><SeriesPattern id="dc-3" i={3} /></defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickFormatter={dm} tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
          <Tooltip labelFormatter={(l) => dm(String(l))} formatter={(v, n) => [v, n === 'completed' ? 'Xong' : 'Lỗi']} />
          <Bar dataKey="completed" stackId="a" fill="url(#dc-0)" stroke={SERIES_COLORS[0]} isAnimationActive={false} /><Bar dataKey="failed" stackId="a" fill="url(#dc-3)" stroke={SERIES_COLORS[3]} isAnimationActive={false} />
        </BarChart></ResponsiveContainer>
      </Card>
      <Card title="Tỉ lệ lỗi theo ngày" tip="Task lỗi hẳn / (task xong + task lỗi hẳn) trong ngày. Ngày không có task kết thúc thì để trống, không vẽ 0%." label="Tỉ lệ lỗi theo ngày" empty={rate.every((r) => r.rate == null)} table={rate.map((r) => [dm(r.day), r.rate == null ? '—' : `${r.rate}%`])}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={rate} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickFormatter={dm} tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} /><YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12 }} width={40} />
          <Tooltip labelFormatter={(l) => dm(String(l))} formatter={(v) => [`${v}%`, 'Tỉ lệ lỗi']} />
          <Line type="monotone" dataKey="rate" stroke={SERIES_COLORS[3]} strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3, fill: SERIES_COLORS[3] }} connectNulls isAnimationActive={false} />
        </LineChart></ResponsiveContainer>
      </Card>
      <Card title="Phân bố thời gian xử lý" tip="Số task XONG theo khoảng thời gian từ lúc bắt đầu chạy tới lúc xong." label="Phân bố thời gian xử lý" empty={none(buckets.map((b) => b.count))} legend={[{ name: 'Số task', i: 2 }]} table={buckets.map((b) => [b.label, String(b.count)])}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs><SeriesPattern id="dc-2" i={2} /></defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
          <Tooltip formatter={(v) => [v, 'Số task']} /><Bar dataKey="count" fill="url(#dc-2)" stroke={SERIES_COLORS[2]} isAnimationActive={false} />
        </BarChart></ResponsiveContainer>
      </Card>
      <Card title="Chi phí theo phòng ban" tip="Chi phí các cuộc gọi mô hình của task xong trong khoảng, gom theo phòng của agent." label="Chi phí theo phòng ban" empty={none(costDept.map((d) => d.totalMicro))} legend={[{ name: 'Chi phí', i: 1 }]} table={costDept.map((d) => [d.label, money(d.totalMicro)])}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={costDept} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          <defs><SeriesPattern id="dc-1" i={1} /></defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(v: number) => money(v)} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => [money(Number(v)), 'Chi phí']} /><Bar dataKey="totalMicro" fill="url(#dc-1)" stroke={SERIES_COLORS[1]} isAnimationActive={false} />
        </BarChart></ResponsiveContainer>
      </Card>
    </div>
  )
}
export default memo(DashCharts)
