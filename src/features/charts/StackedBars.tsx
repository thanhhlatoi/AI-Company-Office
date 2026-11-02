import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SERIES_COLORS } from './colors'
import { SeriesPattern, Swatch } from './palette'

export interface Series { key: string; label: string }
type Row = { day: string } & Record<string, number | string>

const dm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`
const ci = (s: Series, i: number) => (s.key === 'other' ? 6 : i) // "Khác" luôn màu xám

/** Cột xếp chồng theo ngày. Mỗi chuỗi có màu + hoa văn riêng; có chú thích và bảng dữ liệu thay thế cho trình đọc màn hình. */
export default function StackedBars({ data, series, format, ariaLabel }: { data: Row[]; series: Series[]; format: (n: number) => string; ariaLabel: string }) {
  const total = (r: Row) => series.reduce((s, x) => s + Number(r[x.key] ?? 0), 0)
  return (
    <figure className="space-y-2">
      <div role="img" aria-label={ariaLabel} className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>{series.map((s, i) => <SeriesPattern key={s.key} id={`bar-${i}`} i={ci(s, i)} />)}</defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickFormatter={dm} tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tickFormatter={(v: number) => format(v)} tick={{ fontSize: 12 }} width={64} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
              <div className="rounded-lg border border-slate-300 bg-white p-2 text-xs shadow-lg">
                <div className="mb-1 font-bold">{dm(String(label))}</div>
                {payload.filter((p) => Number(p.value) > 0).map((p) => <div key={String(p.dataKey)} className="flex justify-between gap-4"><span>{series.find((s) => s.key === p.dataKey)?.label}</span><b className="tabular-nums">{format(Number(p.value))}</b></div>)}
              </div>) : null} />
            {series.map((s, i) => <Bar key={s.key} dataKey={s.key} stackId="a" fill={`url(#bar-${i})`} stroke={SERIES_COLORS[ci(s, i) % SERIES_COLORS.length]} isAnimationActive={false} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">{series.map((s, i) => <li key={s.key} className="flex items-center gap-1.5"><Swatch i={ci(s, i)} />{s.label}</li>)}</ul>
      <details className="text-xs"><summary className="cursor-pointer text-slate-600">Xem dạng bảng</summary>
        <div className="mt-1 max-h-48 overflow-auto"><table className="w-full text-left tabular-nums">
          <thead><tr><th className="pr-2">Ngày</th>{series.map((s) => <th key={s.key} className="px-2">{s.label}</th>)}<th className="px-2">Tổng</th></tr></thead>
          <tbody>{data.map((r) => <tr key={r.day}><td className="pr-2">{dm(r.day)}</td>{series.map((s) => <td key={s.key} className="px-2">{format(Number(r[s.key] ?? 0))}</td>)}<td className="px-2 font-semibold">{format(total(r))}</td></tr>)}</tbody>
        </table></div>
      </details>
    </figure>
  )
}
