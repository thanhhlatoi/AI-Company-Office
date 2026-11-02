import { HelpTip } from '../projects/ProjectParts'

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Heatmap giờ x thứ (số task xong). Chỉ hiện khi BE có đủ dữ liệu; màu đậm = nhiều, có số trong chú giải và `aria-label` từng ô. */
export function Heatmap({ data }: { data: number[][] }) {
  const max = Math.max(1, ...data.flat())
  return (
    <section aria-label="Heatmap giờ và thứ" className="rounded-card border border-slate-200 bg-white p-4">
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">Giờ làm việc nhiều nhất <HelpTip text="Số task XONG theo giờ trong ngày (giờ Việt Nam) và thứ trong tuần, cộng dồn cả khoảng đã chọn." /></h2>
      <div className="overflow-x-auto"><div className="grid min-w-[40rem] gap-0.5" style={{ gridTemplateColumns: '2rem repeat(24, minmax(0, 1fr))' }}>
        <span />{Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center text-[10px] text-slate-600">{h % 3 === 0 ? h : ''}</span>)}
        {data.map((row, d) => (
          <div key={d} className="contents">
            <span className="self-center text-xs font-medium text-slate-700">{DAYS[d]}</span>
            {row.map((n, h) => <span key={h} role="img" aria-label={`${DAYS[d]} lúc ${h} giờ: ${n} task`} title={`${DAYS[d]} ${h}h: ${n} task`} className="aspect-square rounded-sm border border-slate-100" style={{ background: n ? `rgba(0, 114, 178, ${0.15 + (0.85 * n) / max})` : '#f1f5f9' }} />)}
          </div>
        ))}
      </div></div>
      <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">Ít <span aria-hidden="true" className="h-2 w-24 rounded" style={{ background: 'linear-gradient(90deg, rgba(0,114,178,0.15), rgba(0,114,178,1))' }} /> Nhiều (tối đa {max} task/ô)</p>
    </section>
  )
}
