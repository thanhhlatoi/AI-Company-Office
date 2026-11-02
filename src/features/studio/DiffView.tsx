import { diffStats, lineDiff } from '../../lib/diff'

const LINE = { same: { mark: ' ', cls: 'text-slate-700', sr: '' }, add: { mark: '+', cls: 'bg-green-50 text-green-900', sr: 'Thêm: ' }, del: { mark: '−', cls: 'bg-red-50 text-red-900', sr: 'Bỏ: ' } } as const

/** Khác biệt theo dòng: ký hiệu +/− kèm màu (không chỉ màu). Chữ luôn là văn bản thường. */
export function DiffView({ oldText, newText, label }: { oldText: string; newText: string; label: string }) {
  const d = lineDiff(oldText, newText), s = diffStats(d)
  if (!s.added && !s.removed) return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Hai bản giống hệt nhau.</p>
  return (
    <div>
      <p className="mb-1 text-xs text-slate-700">Thêm {s.added} dòng, bỏ {s.removed} dòng</p>
      <pre aria-label={label} tabIndex={0} className="max-h-72 overflow-auto rounded-lg border border-slate-200 text-xs leading-5">
        {d.map((l, i) => (
          <div key={i} className={`flex whitespace-pre-wrap break-words px-2 ${LINE[l.kind].cls}`}>
            <span aria-hidden className="w-4 shrink-0 select-none">{LINE[l.kind].mark}</span>
            <span className="sr-only">{LINE[l.kind].sr}</span>
            <span className="min-w-0">{l.text || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  )
}
