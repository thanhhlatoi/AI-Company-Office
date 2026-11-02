// Bản xem trước CHÍNH XÁC hành động sẽ thực hiện: hiển thị nguyên văn argsSnapshot, không cắt, không diễn giải.
const LABELS: Record<string, string> = {
  to: 'Người nhận', cc: 'CC', bcc: 'BCC', subject: 'Tiêu đề', body: 'Nội dung',
  payee: 'Nhận tiền', amount: 'Số tiền', note: 'Ghi chú', path: 'Đường dẫn', files: 'Số tệp', action: 'Hành động',
}

function Value({ k, v, args }: { k: string; v: unknown; args: Record<string, unknown> }) {
  if (k === 'amount' && typeof v === 'number') {
    const cur = typeof args.currency === 'string' ? ` ${args.currency}` : ''
    return <span className="text-xl font-bold tabular-nums">{v.toLocaleString('vi-VN')}{cur}</span>
  }
  if (typeof v === 'string' && (v.includes('\n') || v.length > 80)) {
    return <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-sans text-base leading-relaxed">{v}</pre>
  }
  if (typeof v === 'object' && v !== null) return <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-mono text-sm">{JSON.stringify(v, null, 2)}</pre>
  return <span className="break-words text-base">{String(v)}</span>
}

export function ArgsPreview({ action, args }: { action?: string | null; args: Record<string, unknown> }) {
  // currency đã gộp vào dòng "Số tiền" khi amount là số
  const rows = Object.entries(args).filter(([k]) => !(k === 'currency' && typeof args.amount === 'number'))
  return (
    <section aria-label="Hành động sẽ thực hiện" className="rounded-card border-2 border-slate-300 bg-white p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Hành động sẽ thực hiện{action && <code className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono normal-case text-slate-700">{action}</code>}
      </h4>
      {rows.length === 0 ? (
        <p className="text-base text-amber-700">Yêu cầu không kèm chi tiết hành động. Hãy cân nhắc kỹ trước khi duyệt.</p>
      ) : (
        <dl className="space-y-3">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm font-medium text-slate-600">{LABELS[k] ?? k}</dt>
              <dd className="mt-0.5"><Value k={k} v={v} args={args} /></dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
