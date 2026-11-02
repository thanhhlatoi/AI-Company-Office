import { useId, useState, type CSSProperties } from 'react'
import { formatDay } from '../../lib/time'
import { useMoney } from '../../lib/useMoney'
import type { Project } from '../../types/project'
import { useNow } from '../approvals/hooks'

/** Vòng tiến độ %. */
export function ProgressRing({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} role="img" aria-label={`Tiến độ ${pct}%`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#15803d" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * pct) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-slate-900 font-bold tabular-nums" fontSize={size / 4}>{pct}%</text>
    </svg>
  )
}

// Mỗi trạng thái có MÀU + HOA VĂN riêng và nhãn chữ trong chú thích (không chỉ dựa vào màu)
const SEGMENTS: { key: keyof Project['counts']; label: string; style: CSSProperties }[] = [
  { key: 'done', label: 'xong', style: { background: '#15803d' } },
  { key: 'running', label: 'đang làm', style: { background: '#1d4ed8' } },
  { key: 'awaitingApproval', label: 'chờ duyệt', style: { background: 'repeating-linear-gradient(45deg,#b45309 0 4px,#fbbf24 4px 8px)' } },
  { key: 'waitingBudget', label: 'chờ ngân sách', style: { background: 'radial-gradient(#92400e 25%, #fde68a 26%) 0 0/6px 6px' } },
  { key: 'queued', label: 'chờ', style: { background: '#94a3b8' } },
  { key: 'failed', label: 'lỗi', style: { background: 'repeating-linear-gradient(-45deg,#b91c1c 0 3px,#fecaca 3px 6px)' } },
  { key: 'cancelled', label: 'huỷ', style: { background: '#e2e8f0' } },
]

/** Thanh xếp chồng số task theo trạng thái + chú thích có số. */
export function StatusBar({ counts, legend = true }: { counts: Project['counts']; legend?: boolean }) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0)
  const parts = SEGMENTS.filter((s) => counts[s.key] > 0)
  const text = parts.map((s) => `${counts[s.key]} ${s.label}`).join(', ')
  return (
    <div>
      <div role="img" aria-label={total ? `Task: ${text}` : 'Chưa có task'} className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        {parts.map((s) => <div key={s.key} style={{ ...s.style, width: `${(counts[s.key] / total) * 100}%` }} />)}
      </div>
      {legend && <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">{parts.map((s) => <li key={s.key} className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={s.style} aria-hidden="true" /><b className="tabular-nums">{counts[s.key]}</b> {s.label}</li>)}</ul>}
    </div>
  )
}

/** Thanh chi phí so với ngân sách: xanh -> vàng (80%) -> đỏ (100%). Không có ngân sách thì chỉ hiện chi phí. */
export function BudgetBar({ cost, budget }: { cost: number; budget?: number | null }) {
  const money = useMoney()
  if (!budget) return <p className="text-xs text-slate-600">Chi phí <b className="tabular-nums">{money(cost)}</b> · chưa đặt ngân sách</p>
  const pct = (cost / budget) * 100
  const color = pct >= 100 ? '#b91c1c' : pct >= 80 ? '#b45309' : '#1d4ed8'
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span>Chi phí <b className="tabular-nums">{money(cost)}</b> / {money(budget)}</span><b className="tabular-nums" style={{ color }}>{Math.round(pct)}%{pct >= 100 ? ' · vượt' : pct >= 80 ? ' · sắp hết' : ''}</b></div>
      <div role="progressbar" aria-label="Chi phí so với ngân sách" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} /></div>
    </div>
  )
}

/** Nút "?" giải thích cách tính (hiện khi rê chuột, focus hoặc bấm). */
export function HelpTip({ text, label = 'Tính thế nào?' }: { text: string; label?: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={label} aria-describedby={open ? id : undefined} onClick={(e) => { e.preventDefault(); setOpen(!open) }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        className="grid size-5 place-items-center rounded-full border border-slate-400 text-xs font-bold text-slate-600 hover:bg-slate-100">?</button>
      {open && <span id={id} role="tooltip" className="absolute left-0 top-6 z-30 w-64 rounded-lg bg-slate-900 p-2 text-left text-xs font-normal normal-case text-white shadow-xl">{text}</span>}
    </span>
  )
}

/** Hạn chót: đỏ + số ngày trễ nếu quá hạn mà chưa xong. */
export function DueLabel({ project }: { project: Project }) {
  const now = useNow(60_000)
  if (!project.dueDate) return <span className="text-xs text-slate-600">Chưa đặt hạn chót</span>
  const late = project.status === 'ACTIVE' && project.progressPct < 100 && Date.parse(project.dueDate) < now
  const days = Math.ceil((now - Date.parse(project.dueDate)) / 86_400_000)
  return <span className={`text-xs ${late ? 'font-bold text-red-700' : 'text-slate-600'}`}>Hạn {formatDay(project.dueDate)}{late ? ` · trễ ${days} ngày` : ''}</span>
}
