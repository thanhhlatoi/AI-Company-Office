/** HOA VĂN riêng cho từng chuỗi biểu đồ (cùng bảng màu Okabe-Ito ở colors.ts): không chỉ dựa vào màu. */
import { SERIES_COLORS } from './colors'

/** <pattern> cho chuỗi thứ i (đặt trong <defs>). Hoa văn: đặc, sọc chéo, chấm, kẻ ô, sọc dày, sọc ngược, chấm lớn. */
export function SeriesPattern({ id, i }: { id: string; i: number }) {
  const c = SERIES_COLORS[i % SERIES_COLORS.length]
  const ink = { stroke: '#ffffff', strokeWidth: 1.6, strokeOpacity: 0.85 }
  const kind = i % 7
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform={kind === 5 ? 'rotate(-45)' : kind === 1 || kind === 4 ? 'rotate(45)' : undefined}>
      <rect width="8" height="8" fill={c} />
      {kind === 1 && <line x1="0" y1="0" x2="0" y2="8" {...ink} />}
      {kind === 2 && <circle cx="4" cy="4" r="1.5" fill="#ffffff" fillOpacity={0.85} />}
      {kind === 3 && <path d="M0 4H8M4 0V8" {...ink} />}
      {kind === 4 && <rect x="0" y="0" width="3" height="8" fill="#ffffff" fillOpacity={0.55} />}
      {kind === 5 && <line x1="0" y1="0" x2="0" y2="8" {...ink} />}
      {kind === 6 && <circle cx="4" cy="4" r="2.4" fill="#ffffff" fillOpacity={0.7} />}
    </pattern>
  )
}

/** Ô màu nhỏ của chú thích, cùng hoa văn với cột trong biểu đồ. */
export function Swatch({ i }: { i: number }) {
  const id = `sw${i}`
  return <svg width="16" height="16" aria-hidden="true" className="shrink-0 rounded-sm"><defs><SeriesPattern id={id} i={i} /></defs><rect width="16" height="16" fill={`url(#${id})`} /></svg>
}
