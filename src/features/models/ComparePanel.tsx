import { TriangleAlert } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { DataClassBadge } from '../../components/studio/badges'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { formatUsd, MICRO } from '../../lib/money'
import { formatDateTime } from '../../lib/time'
import type { Comparison } from '../../types/models'
import { SafeMarkdown } from '../history/SafeMarkdown'
import { useComparisons, useModelProfiles } from '../studio/queries'
import { useEstimate, useRunComparison, useSaveComparison } from './modelMutations'

/** Ước tính vượt ngưỡng này thì phải xác nhận trước khi chạy (0,05 USD) */
export const CONFIRM_ABOVE_MICRO = MICRO / 20

function Results({ c }: { c: Comparison }) {
  const models = useModelProfiles().data ?? []
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Kết quả so sánh" role="group">
      {c.results.map((r) => { const m = models.find((x) => x.id === r.modelId); return (
        <section key={r.modelId} aria-label={m?.label ?? r.modelId} className="flex min-w-0 flex-col gap-2 rounded-card border border-slate-200 bg-white p-3">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">{m?.label ?? r.modelId}{m && <DataClassBadge value={m.dataClass} />}</h3>
          {r.error ? <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm font-medium text-red-900">Lỗi: {r.error}</p> : <div className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-2 text-sm"><SafeMarkdown text={r.output} /></div>}
          <dl className="mt-auto grid grid-cols-2 gap-x-2 text-xs text-slate-700"><dt>Token vào / ra</dt><dd className="text-right">{r.inputTokens} / {r.outputTokens}</dd><dt>Chi phí</dt><dd className="text-right">{formatUsd(r.costMicro)}</dd><dt>Độ trễ</dt><dd className="text-right">{r.latencyMs} ms</dd></dl>
        </section>
      ) })}
    </div>
  )
}

export function ComparePanel() {
  const models = useModelProfiles().data ?? [], history = useComparisons()
  const [prompt, setPrompt] = useState(''), [ids, setIds] = useState<string[]>([])
  const [shown, setShown] = useState<Comparison | null>(null), [asking, setAsking] = useState(false)
  const est = useEstimate(useDeferredValue(prompt), ids), run = useRunComparison(), save = useSaveComparison()
  const picked = models.filter((m) => ids.includes(m.id)), cloud = picked.filter((m) => m.dataClass === 'CLOUD')
  const toggle = (id: string) => setIds((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length < 4 ? [...x, id] : x))
  const go = () => run.mutate({ prompt, modelIds: ids }, { onSuccess: (c) => { setShown(c); setAsking(false) } })
  const start = () => ((est.data?.estimateMicro ?? 0) > CONFIRM_ABOVE_MICRO ? setAsking(true) : go())
  const unsaved = shown && !history.data?.some((h) => h.id === shown.id)
  return (
    <div className="space-y-5">
      <section aria-label="Thiết lập so sánh" className="space-y-3">
        <label className="block text-sm font-medium">Prompt<textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={4000} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" /></label>
        <fieldset><legend className="mb-1 text-sm font-medium">Chọn 2–4 model ({ids.length}/4)</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{models.map((m) => (
            <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${ids.includes(m.id) ? 'border-brand bg-blue-50' : 'border-slate-200'} ${m.health.status === 'DOWN' ? 'opacity-70' : ''}`}>
              <input type="checkbox" checked={ids.includes(m.id)} disabled={!ids.includes(m.id) && ids.length >= 4} onChange={() => toggle(m.id)} />{m.label}<DataClassBadge value={m.dataClass} />{m.health.status === 'DOWN' && <span className="text-xs font-bold text-red-800">ngừng</span>}
            </label>))}</div></fieldset>
        {cloud.length > 0 && <p role="alert" className="flex gap-2 rounded-lg border border-orange-300 bg-orange-50 p-2 text-sm text-orange-950"><TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden /><span><b>Không đưa dữ liệu CONFIDENTIAL vào so sánh với model CLOUD</b> ({cloud.map((m) => m.label).join(', ')}): prompt sẽ được gửi ra ngoài công ty.</span></p>}
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={!prompt.trim() || ids.length < 2 || run.isPending} onClick={start} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{run.isPending ? 'Đang chạy…' : 'Chạy so sánh'}</button>
          <span aria-live="polite" className="text-sm text-slate-700">{ids.length >= 2 && prompt.trim() ? (est.data ? <>Ước tính chi phí: <b>{formatUsd(est.data.estimateMicro)}</b> (giả định ~400 token đầu ra mỗi model)</> : 'Đang ước tính…') : 'Nhập prompt và chọn ít nhất 2 model để xem ước tính chi phí.'}</span>
        </div>
      </section>
      {shown && <section aria-label="Kết quả" className="space-y-2"><div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">Kết quả{shown.createdAt && <span className="ml-2 text-xs font-normal text-slate-700">{formatDateTime(shown.createdAt)}</span>}</h2>
        {unsaved && <button disabled={save.isPending} onClick={() => save.mutate(shown, { onSuccess: (c) => setShown(c) })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">Lưu so sánh</button>}</div>
        <p className="text-xs text-slate-700">Prompt: “{shown.prompt.slice(0, 160)}”</p><Results c={shown} /></section>}
      <section aria-label="Lịch sử so sánh" className="space-y-2"><h2 className="text-base font-semibold">Lịch sử đã lưu</h2>
        {history.isLoading && <div className="h-12 animate-pulse rounded-card bg-slate-200" />}
        {history.data?.length === 0 && <p className="text-sm text-slate-700">Chưa lưu so sánh nào.</p>}
        <ul className="space-y-1">{history.data?.map((h) => <li key={h.id}><button onClick={() => setShown(h)} className="w-full rounded-lg border border-slate-200 p-2 text-left text-sm hover:bg-slate-50"><b>{formatDateTime(h.createdAt)}</b> · {h.results.length} model · {h.prompt.slice(0, 80)}</button></li>)}</ul></section>
      {asking && <TwoStepConfirm title="Chi phí ước tính khá cao" askReason={false} confirmLabel="Vẫn chạy" busy={run.isPending} preview={<p className="text-sm">Ước tính <b>{formatUsd(est.data?.estimateMicro ?? 0)}</b>, vượt ngưỡng {formatUsd(CONFIRM_ABOVE_MICRO)}. Đây là chi phí thật nếu có model CLOUD.</p>} onClose={() => setAsking(false)} onConfirm={go} />}
    </div>
  )
}
