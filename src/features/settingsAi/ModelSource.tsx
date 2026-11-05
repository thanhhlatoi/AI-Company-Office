import { describeError } from './errors'
import { useAiModels } from './hooks'

/** Nút tải danh sách model/combo từ một nguồn + danh sách kết quả (nhãn "có tools", "thinking"). `onPick` vắng = chỉ xem. */
export function ModelSource({ source, loadLabel, pickLabel = 'Chọn', selected, onPick }: { source: 'ollama' | 'omniroute'; loadLabel: string; pickLabel?: string; selected?: string; onPick?: (id: string) => void }) {
  const q = useAiModels(source)
  const err = q.isError ? describeError(q.error) : null
  return (
    <div className="space-y-2">
      <button onClick={() => void q.refetch()} disabled={q.isFetching} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">{q.isFetching ? 'Đang tải…' : loadLabel}</button>
      {err && <p role="alert" className="text-sm text-red-800">⚠ {err.message}{err.requestId ? ` (mã tra log: ${err.requestId})` : ''}</p>}
      {q.data && q.data.models.length === 0 && <p className="text-sm text-slate-700">Không thấy model nào.</p>}
      {q.data && q.data.models.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm" aria-label="Tìm thấy">
          {q.data.models.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 p-2">
              <span className="font-medium">{m.label ?? m.id}</span>
              {m.label && <span className="text-xs text-slate-600">{m.id}</span>}
              {m.supportsTools && <span className="rounded bg-slate-100 px-1.5 text-xs">có tools</span>}
              {m.thinking && <span className="rounded bg-slate-100 px-1.5 text-xs">thinking</span>}
              {onPick && <button onClick={() => onPick(m.id)} aria-pressed={selected === m.id} className="ml-auto rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50 aria-pressed:bg-brand/10">{selected === m.id ? 'Đang chọn' : pickLabel}</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
