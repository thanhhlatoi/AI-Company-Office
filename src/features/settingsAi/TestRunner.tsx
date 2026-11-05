import { CircleCheck, CircleX, Loader2 } from 'lucide-react'
import type { TestBody } from '../../types/settingsAi'
import { useTester } from './useTester'

const DIAGNOSE = ['Sai địa chỉ hoặc quên /v1?', 'Ollama đang chạy?', 'BE cùng mạng LAN với máy AI?']

/** Nút thử + nút huỷ + kết quả (vùng aria-live). `body` null = chưa thử được, kèm lý do. Mọi nội dung hiện dạng văn bản thuần. */
export function TestRunner({ label, body, disabledReason }: { label: string; body: TestBody | null; disabledReason?: string }) {
  const t = useTester()
  const running = t.state.status === 'running'
  const code = t.state.status === 'error' ? t.state.code : t.state.status === 'done' ? t.state.result.errorCode : undefined
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => body && void t.run(body)} disabled={!body || running} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">{label}</button>
        {running && <button onClick={t.cancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Huỷ</button>}
        {!body && disabledReason && <span className="text-xs text-slate-600">{disabledReason}</span>}
      </div>
      <div aria-live="polite" className="text-sm">
        {running && <p className="flex items-center gap-1.5 text-slate-700"><Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden />Đang thử… (lần đầu có thể chậm vì Ollama nạp model)</p>}
        {t.state.status === 'done' && (
          <div className={`space-y-1 rounded-lg p-3 ${t.state.result.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
            <p className="flex items-center gap-1.5 font-medium">{t.state.result.ok ? <CircleCheck size={14} aria-hidden /> : <CircleX size={14} aria-hidden />}{t.state.result.ok ? 'Thành công' : 'Thất bại'} · {t.state.result.latencyMs} ms</p>
            <p>{t.state.result.message}</p>
            {t.state.result.models && <p>Tìm thấy {t.state.result.models.length} model: {t.state.result.models.join(', ')}</p>}
            {t.state.result.sample !== undefined && <p>Câu trả lời mẫu: “{t.state.result.sample}”</p>}
            {t.state.result.requestId && <p className="text-xs">Mã tra log: {t.state.result.requestId}</p>}
          </div>
        )}
        {t.state.status === 'error' && (
          <div className="space-y-1 rounded-lg bg-red-50 p-3 text-red-900">
            <p className="flex items-center gap-1.5 font-medium"><CircleX size={14} aria-hidden />Lỗi: {t.state.message}</p>
            {t.state.requestId && <p className="text-xs">Mã tra log: {t.state.requestId}</p>}
          </div>
        )}
        {code === 'LLM_UNAVAILABLE' && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-medium">Kiểm tra lần lượt:</p>
            <ul className="list-disc pl-5 text-slate-700">{DIAGNOSE.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  )
}
