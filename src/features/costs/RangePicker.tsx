import type { RangeKind } from '../../lib/range'
import type { UsageGroupBy } from '../../types/cost'
import { GROUP_LABEL, useCostFilters } from './useCostFilters'

const RANGES: [RangeKind, string][] = [['today', 'Hôm nay'], ['7d', '7 ngày'], ['30d', '30 ngày'], ['month', 'Tháng này'], ['custom', 'Tuỳ chọn']]
const SEL = 'min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm'

/** Chọn khoảng thời gian (Hôm nay / 7 ngày / 30 ngày / Tháng này / Tuỳ chọn) và nhóm theo. */
export function RangePicker({ groups = true }: { groups?: boolean }) {
  const f = useCostFilters()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Khoảng thời gian" className="flex overflow-hidden rounded-lg border border-slate-300 bg-white text-sm">
        {RANGES.map(([k, label]) => <button key={k} role="radio" aria-checked={f.kind === k} onClick={() => f.set({ range: k === '30d' ? null : k })} className={`min-h-9 px-3 ${f.kind === k ? 'bg-brand font-semibold text-white' : 'hover:bg-slate-50'}`}>{label}</button>)}
      </div>
      {f.kind === 'custom' && (
        <span className="flex items-center gap-1 text-sm">
          <input type="date" aria-label="Từ ngày" value={f.from} onChange={(e) => f.set({ from: e.target.value })} className={SEL} /> –
          <input type="date" aria-label="Đến ngày" value={f.to} onChange={(e) => f.set({ to: e.target.value })} className={SEL} />
          {f.invalidCustom && <span role="alert" className="text-xs text-red-700">Chọn ngày bắt đầu không sau ngày kết thúc (đang dùng 30 ngày)</span>}
        </span>
      )}
      {groups && <label className="ml-auto flex items-center gap-2 text-sm">Nhóm theo
        <select value={f.by} onChange={(e) => f.set({ by: e.target.value === 'agent' ? null : e.target.value })} className={SEL}>{(Object.keys(GROUP_LABEL) as UsageGroupBy[]).map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}</select>
      </label>}
    </div>
  )
}
