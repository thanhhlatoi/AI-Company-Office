import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const dm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`

/** Đường tiến độ % theo ngày (từ ảnh chụp mỗi ngày của BE). */
export default function ProgressLine({ data }: { data: { day: string; progressPct: number }[] }) {
  const first = data[0]?.progressPct ?? 0, last = data[data.length - 1]?.progressPct ?? 0
  return (
    <figure className="space-y-2">
      <div role="img" aria-label={`Tiến độ theo ngày: từ ${first}% lên ${last}% trong ${data.length} ngày`} className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickFormatter={dm} tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12 }} width={44} />
            <Tooltip formatter={(v) => [`${v}%`, 'Tiến độ']} labelFormatter={(l) => dm(String(l))} />
            <Line type="monotone" dataKey="progressPct" stroke="#0072B2" strokeWidth={2.5} dot={{ r: 3, fill: '#0072B2' }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="text-xs"><summary className="cursor-pointer text-slate-600">Xem dạng bảng</summary>
        <div className="mt-1 max-h-40 overflow-auto"><table className="text-left tabular-nums"><tbody>{data.map((r) => <tr key={r.day}><td className="pr-4">{dm(r.day)}</td><td>{r.progressPct}%</td></tr>)}</tbody></table></div>
      </details>
    </figure>
  )
}
