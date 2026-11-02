/** Biểu đồ đường nhỏ cho ~60 điểm gần nhất. Điểm thiếu (undefined) bị bỏ qua. */
export function Sparkline({ values, max, color, label }: { values: (number | undefined)[]; max?: number; color: string; label: string }) {
  const W = 160, H = 36
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null)
  if (pts.length < 2) return <div className="grid h-9 place-items-center text-xs text-slate-600" aria-label={`${label}: chưa đủ dữ liệu`}>chưa đủ dữ liệu</div>
  const top = max ?? Math.max(1, ...pts.map((p) => p[1]))
  const n = Math.max(values.length - 1, 1)
  const d = pts.map(([i, v]) => `${((i / n) * W).toFixed(1)},${(H - 2 - (Math.min(v, top) / top) * (H - 4)).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: hiện tại ${Math.round(pts[pts.length - 1][1])}`} className="h-9 w-full">
      <polyline points={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
