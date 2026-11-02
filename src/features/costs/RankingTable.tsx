import { Download } from 'lucide-react'
import { useState } from 'react'
import { toCsv } from '../../lib/csv'
import { MICRO } from '../../lib/money'
import { useMoney } from '../../lib/useMoney'
import type { UsageRow, UsageSummary } from '../../types/cost'

type Col = 'label' | 'totalMicro' | 'calls' | 'inputTokens' | 'outputTokens'
const COLS: [Col, string, boolean][] = [['label', 'Nhóm', false], ['totalMicro', 'Chi phí', true], ['calls', 'Cuộc gọi', true], ['inputTokens', 'Token vào', true], ['outputTokens', 'Token ra', true]]
const nf = (n: number) => n.toLocaleString('vi-VN')

/** Bảng xếp hạng: bấm tiêu đề để sắp xếp, tải CSV (tiền xuất dạng USD số thập phân). */
export function RankingTable({ u, groupLabel }: { u: UsageSummary; groupLabel: string }) {
  const money = useMoney()
  const [sort, setSort] = useState<{ col: Col; dir: 1 | -1 }>({ col: 'totalMicro', dir: -1 })
  const rows = [...u.rows].sort((a, b) => (sort.col === 'label' ? a.label.localeCompare(b.label, 'vi') : a[sort.col] - b[sort.col]) * sort.dir)
  const download = () => {
    const csv = toCsv([[groupLabel, 'Chi phí (USD)', 'Tỉ lệ (%)', 'Cuộc gọi', 'Token vào', 'Token ra'], ...rows.map((r: UsageRow) => [r.label, (r.totalMicro / MICRO).toFixed(6), u.totalMicro ? ((r.totalMicro / u.totalMicro) * 100).toFixed(2) : '0', r.calls, r.inputTokens, r.outputTokens])])
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })) // BOM để Excel đọc đúng tiếng Việt
    a.download = `chi-phi-${u.from.slice(0, 10)}-${u.to.slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <section aria-label="Bảng xếp hạng chi phí">
      <div className="mb-2 flex items-center"><h2 className="text-base font-semibold">Xếp hạng theo {groupLabel.toLowerCase()}</h2><button onClick={download} className="ml-auto flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"><Download size={14} aria-hidden="true" /> Tải CSV</button></div>
      <div className="overflow-x-auto rounded-card border border-slate-200 bg-white">
        <table className="w-full min-w-[40rem] text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-600">
            {COLS.map(([c, label, num]) => (
              <th key={c} scope="col" aria-sort={sort.col === c ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 font-semibold ${num ? 'text-right' : ''}`}>
                <button onClick={() => setSort({ col: c, dir: sort.col === c ? (sort.dir === 1 ? -1 : 1) : c === 'label' ? 1 : -1 })} className="font-semibold uppercase hover:underline">{label}{sort.col === c ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button>
              </th>))}
            <th className="px-3 py-2 text-right font-semibold">Tỉ lệ</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-slate-100">
                <th scope="row" className="px-3 py-2 text-left font-medium">{r.label}</th>
                <td className="px-3 py-2 text-right font-bold tabular-nums">{money(r.totalMicro)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{nf(r.calls)}</td><td className="px-3 py-2 text-right tabular-nums">{nf(r.inputTokens)}</td><td className="px-3 py-2 text-right tabular-nums">{nf(r.outputTokens)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{u.totalMicro ? ((r.totalMicro / u.totalMicro) * 100).toFixed(1) : '0'}%</td>
              </tr>))}
            <tr className="bg-slate-50 font-bold"><th scope="row" className="px-3 py-2 text-left">Tổng</th><td className="px-3 py-2 text-right tabular-nums">{money(u.totalMicro)}</td><td className="px-3 py-2 text-right tabular-nums">{nf(u.calls)}</td><td className="px-3 py-2 text-right tabular-nums">{nf(u.inputTokens)}</td><td className="px-3 py-2 text-right tabular-nums">{nf(u.outputTokens)}</td><td className="px-3 py-2 text-right">100%</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
