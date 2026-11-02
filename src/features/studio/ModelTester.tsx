import { useState } from 'react'
import { SafeMarkdown } from '../history/SafeMarkdown'
import { formatUsd } from '../../lib/money'
import type { ModelProfile } from '../../types/models'
import { useTestModel } from './mutations'

/** "Thử model": gửi một prompt ngắn, hiện đầu ra (markdown đã làm sạch), token, chi phí, độ trễ. */
export function ModelTester({ models, defaultId }: { models: ModelProfile[]; defaultId: string }) {
  const [id, setId] = useState(defaultId)
  const [prompt, setPrompt] = useState('Giới thiệu ngắn về bạn trong một câu.')
  const test = useTestModel()
  const r = test.data
  return (
    <section aria-label="Thử model" className="space-y-2 rounded-card border border-slate-200 p-3">
      <h3 className="text-sm font-semibold">Thử model</h3>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Model cần thử" value={id} onChange={(e) => setId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">{models.map((m) => <option key={m.id} value={m.id}>{m.label} ({m.dataClass})</option>)}</select>
        <input aria-label="Prompt thử" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={500} className="min-w-48 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <button disabled={test.isPending || !prompt.trim()} onClick={() => test.mutate({ modelId: id, prompt })} className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{test.isPending ? 'Đang chạy…' : 'Chạy thử'}</button>
      </div>
      <p className="text-xs text-slate-700">Đây là một lần gọi thật: tốn token (với model CLOUD). Đừng dán dữ liệu mật vào model CLOUD.</p>
      {r && (r.error
        ? <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-900">Lỗi: {r.error}</p>
        : <div role="status" className="space-y-1"><div className="rounded-lg bg-slate-50 p-2 text-sm"><SafeMarkdown text={r.output} /></div><p className="text-xs text-slate-700">{r.inputTokens} token vào · {r.outputTokens} token ra · {formatUsd(r.costMicro)} · {r.latencyMs} ms</p></div>)}
    </section>
  )
}
