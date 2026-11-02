import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBanner } from '../components/ErrorBanner'
import { AGENT_MODELS } from '../lib/config'
import { usdToMicro, MICRO } from '../lib/money'
import { dayKey, formatDay } from '../lib/time'
import { useAddPrice, useModelPrices } from '../features/costs/hooks'

const FIELD = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none'
const usd = (micro: number) => `$${(micro / MICRO).toLocaleString('en-US', { maximumFractionDigits: 4 })}`

/** /costs/prices — bảng giá model (USD cho mỗi 1 triệu token); thêm bản ghi giá mới có ngày hiệu lực. */
export default function PricesPage() {
  const q = useModelPrices()
  const add = useAddPrice()
  const [model, setModel] = useState(''), [input, setInput] = useState(''), [output, setOutput] = useState('')
  const [from, setFrom] = useState(() => dayKey(Date.now()))
  const [error, setError] = useState('')
  const unpriced = AGENT_MODELS.filter((m) => !q.data?.some((p) => p.model === m))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!model.trim()) return setError('Hãy nhập tên model')
    if (!(Number(input) >= 0) || !(Number(output) >= 0) || input === '' || output === '') return setError('Giá phải là số không âm')
    setError('')
    add.mutate({ model: model.trim(), inputPerMTokMicro: usdToMicro(Number(input)), outputPerMTokMicro: usdToMicro(Number(output)), effectiveFrom: new Date(`${from}T00:00:00+07:00`).toISOString() }, { onSuccess: () => { setModel(''); setInput(''); setOutput('') }, onError: () => setError('Không lưu được giá, thử lại') })
  }
  const rows = [...(q.data ?? [])].sort((a, b) => a.model.localeCompare(b.model) || Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))
  return (
    <div className="mx-auto h-full max-w-4xl space-y-5 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24">
      <header><Link to="/costs" className="text-sm text-brand underline">← Chi phí</Link><h1 className="mt-1 text-2xl font-bold">Bảng giá model</h1><p className="text-sm text-slate-600">Giá tính bằng USD cho mỗi 1 triệu token. Cuộc gọi sau ngày hiệu lực dùng giá mới nhất; cuộc gọi chưa có giá sẽ được tính lại khi bạn thêm giá.</p></header>
      {q.isError && <ErrorBanner message="Không tải được bảng giá." onRetry={() => void q.refetch()} />}
      {unpriced.length > 0 && <p role="status" className="rounded-card bg-yellow-100 px-3 py-2 text-sm text-yellow-950">Model chưa có giá: {unpriced.map((m) => <button key={m} onClick={() => setModel(m)} className="mx-1 rounded bg-yellow-300 px-2 py-0.5 font-mono text-xs font-bold">{m}</button>)} (bấm để điền sẵn)</p>}
      <form onSubmit={submit} className="space-y-3 rounded-card border border-slate-300 bg-white p-4" noValidate aria-label="Thêm giá model">
        <h2 className="font-semibold">Thêm giá mới</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-medium">Model</span><input list="models" value={model} onChange={(e) => setModel(e.target.value)} className={FIELD} /><datalist id="models">{AGENT_MODELS.map((m) => <option key={m} value={m} />)}</datalist></label>
          <label className="block"><span className="mb-1 block text-sm font-medium">Giá vào ($/1M token)</span><input inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} className={FIELD} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium">Giá ra ($/1M token)</span><input inputMode="decimal" value={output} onChange={(e) => setOutput(e.target.value)} className={FIELD} /></label>
        </div>
        <label className="block max-w-xs"><span className="mb-1 block text-sm font-medium">Có hiệu lực từ ngày</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD} /></label>
        {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
        <button type="submit" disabled={add.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">{add.isPending ? 'Đang lưu…' : 'Thêm giá'}</button>
      </form>
      {q.isLoading && <div className="h-32 animate-pulse rounded-card bg-slate-200" aria-busy="true" />}
      {rows.length === 0 && !q.isLoading && <p className="text-sm text-slate-600">Chưa có giá nào.</p>}
      {rows.length > 0 && (
        <table className="w-full rounded-card border border-slate-200 bg-white text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-600"><th className="px-3 py-2">Model</th><th className="px-3 py-2 text-right">Giá vào</th><th className="px-3 py-2 text-right">Giá ra</th><th className="px-3 py-2 text-right">Hiệu lực từ</th></tr></thead>
          <tbody>{rows.map((p) => <tr key={p.id} className="border-b border-slate-100"><th scope="row" className="px-3 py-2 text-left font-mono text-xs">{p.model}</th><td className="px-3 py-2 text-right tabular-nums">{usd(p.inputPerMTokMicro)}</td><td className="px-3 py-2 text-right tabular-nums">{usd(p.outputPerMTokMicro)}</td><td className="px-3 py-2 text-right tabular-nums">{formatDay(p.effectiveFrom)}</td></tr>)}</tbody></table>
      )}
    </div>
  )
}
