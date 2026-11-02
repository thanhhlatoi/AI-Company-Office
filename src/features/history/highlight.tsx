import type { ReactNode } from 'react'
import { splitMatches } from '../../lib/text'

/** Tô nổi từ khoá (không dấu, không phân biệt hoa thường) trong một chuỗi. `data-hit` để nhảy tới kết quả. */
export function Hl({ text, q }: { text: string; q: string }): ReactNode {
  if (!q.trim()) return text
  return splitMatches(text.normalize('NFC'), q).map((p, i) => (p.hit ? <mark key={i} data-hit className="rounded bg-yellow-200 px-0.5 text-inherit">{p.text}</mark> : p.text))
}

/** Nhãn bí mật đã bị BE che: hiện rõ, không thể nhầm với nội dung thật. */
const IS_REDACTED = /^\[REDACTED:[A-Za-z0-9_-]+\]$/
export function RedactedBadge({ label }: { label: string }) {
  return <span role="img" aria-label={`Đã che bí mật ${label}`} className="inline-block rounded border border-red-300 bg-red-100 px-1 font-mono text-xs font-bold text-red-800">🔒 {label}</span>
}

/** Văn bản thuần (không markdown): thay nhãn [REDACTED:...] bằng huy hiệu, tô nổi từ khoá. */
export function PlainText({ text, q = '' }: { text: string; q?: string }) {
  const parts = text.split(/(\[REDACTED:[A-Za-z0-9_-]+\])/g)
  return <>{parts.map((p, i) => (IS_REDACTED.test(p) ? <RedactedBadge key={i} label={p} /> : <Hl key={i} text={p} q={q} />))}</>
}
