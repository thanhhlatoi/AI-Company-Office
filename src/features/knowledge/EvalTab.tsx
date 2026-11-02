import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime } from '../../lib/time'
import { useDocuments, useEvalSet } from '../studio/queries'
import { useEvalActions } from './mutations'

const pct = (v: number) => `${Math.round(v * 100)}%`
const MIN_QUESTIONS = 20

/** Biểu đồ nhỏ recall@k / MRR qua các lần chạy (SVG tự vẽ, kèm số để không chỉ dựa vào màu). */
function Trend({ runs }: { runs: { recallAtK: number; mrr: number; at: string }[] }) {
  if (runs.length < 2) return null
  const w = 240, h = 60, x = (i: number) => 8 + (i * (w - 16)) / (runs.length - 1), y = (v: number) => h - 8 - v * (h - 16)
  const line = (key: 'recallAtK' | 'mrr') => runs.map((r, i) => `${x(i)},${y(r[key])}`).join(' ')
  return (
    <figure className="space-y-1"><svg role="img" aria-label={`Recall@k các lần chạy: ${runs.map((r) => pct(r.recallAtK)).join(', ')}`} viewBox={`0 0 ${w} ${h}`} className="h-16 w-60 rounded-lg border border-slate-200">
      <polyline points={line('recallAtK')} fill="none" stroke="#1d4ed8" strokeWidth="2" /><polyline points={line('mrr')} fill="none" stroke="#7f1d1d" strokeWidth="2" strokeDasharray="4 3" />
      {runs.map((r, i) => <circle key={i} cx={x(i)} cy={y(r.recallAtK)} r="3" fill="#1d4ed8" />)}</svg>
      <figcaption className="text-xs text-slate-700"><span className="font-semibold text-blue-800">— recall@k</span> · <span className="font-semibold text-red-950">╌ MRR</span></figcaption></figure>
  )
}

export function EvalTab({ collectionId }: { collectionId: string }) {
  const q = useEvalSet(collectionId), docs = (useDocuments(collectionId).data?.pages.flatMap((p) => p.items) ?? []).filter((d) => d.status === 'READY')
  const act = useEvalActions(collectionId)
  const [question, setQuestion] = useState(''), [expected, setExpected] = useState(''), [k, setK] = useState(5)
  if (q.isLoading) return <div className="h-32 animate-pulse rounded-card bg-slate-200" />
  if (q.isError || !q.data) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được bộ kiểm thử. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
  const { questions, runs } = q.data, last = runs.at(-1), prev = runs.at(-2)
  const delta = (a: number, b?: number) => (b == null ? '' : a === b ? ' (không đổi)' : ` (${a > b ? '▲ +' : '▼ '}${Math.round((a - b) * 100)} điểm %)`)
  const exp = expected || docs[0]?.name || ''
  return (
    <section aria-label="Kiểm thử truy hồi" className="space-y-4">
      {questions.length < MIN_QUESTIONS && <p role="status" className="rounded-lg bg-sky-50 p-3 text-sm text-sky-950">Hãy tạo <b>20–30 câu hỏi thật</b> (câu mà người dùng sẽ hỏi) trước khi tin tưởng bộ sưu tập này. Hiện có {questions.length}.</p>}
      <div className="space-y-2 rounded-card border border-slate-200 p-3 text-sm">
        <h3 className="font-semibold">Thêm câu hỏi mẫu</h3>
        <div className="flex flex-wrap gap-2"><input aria-label="Câu hỏi" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Câu hỏi" className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-1.5" />
          <select aria-label="Tài liệu đúng" value={exp} onChange={(e) => setExpected(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5">{docs.map((d) => <option key={d.id}>{d.name}</option>)}</select>
          <button disabled={!question.trim() || !exp || act.add.isPending} onClick={() => act.add.mutate({ question: question.trim(), expected: exp }, { onSuccess: () => setQuestion('') })} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50">Thêm</button></div>
        <ul className="space-y-1">{questions.map((x) => <li key={x.id} className="flex items-center gap-2"><span className="min-w-0 flex-1 break-words">“{x.question}” → <b>{x.expected}</b></span><button aria-label={`Xoá câu hỏi ${x.question}`} onClick={() => act.remove.mutate(x.id)} className="rounded p-1 text-red-800 hover:bg-red-50"><Trash2 size={14} /></button></li>)}</ul>
        <div className="flex items-center gap-2 border-t border-slate-200 pt-2"><label>Top k<select value={k} onChange={(e) => setK(Number(e.target.value))} className="ml-1 rounded-lg border border-slate-300 px-2 py-1">{[3, 5, 10].map((n) => <option key={n}>{n}</option>)}</select></label>
          <button disabled={!questions.length || act.run.isPending} onClick={() => act.run.mutate(k)} className="rounded-lg bg-brand px-4 py-1.5 text-white hover:bg-brand-dark disabled:opacity-50">{act.run.isPending ? 'Đang chạy…' : 'Chạy kiểm thử'}</button></div>
      </div>
      {last && (
        <div className="space-y-2"><h3 className="text-sm font-semibold">Lần chạy gần nhất · {formatDateTime(last.at)} · k = {last.k}</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:max-w-md"><div className="rounded-card border border-slate-200 p-2"><dt className="text-xs text-slate-700">Recall@{last.k}</dt><dd className="text-xl font-bold">{pct(last.recallAtK)}<span className="text-xs font-normal">{delta(last.recallAtK, prev?.recallAtK)}</span></dd></div>
            <div className="rounded-card border border-slate-200 p-2"><dt className="text-xs text-slate-700">MRR</dt><dd className="text-xl font-bold">{last.mrr.toFixed(2)}<span className="text-xs font-normal">{delta(last.mrr, prev?.mrr)}</span></dd></div></dl>
          <Trend runs={runs} />
          {last.misses.length > 0 ? <div><h4 className="text-sm font-semibold">Ca trượt ({last.misses.length})</h4><ul className="mt-1 space-y-1 text-sm">{last.misses.map((m, i) => <li key={i} className="rounded-lg border border-red-200 bg-red-50 p-2">“{m.question}” — đáng ra phải tìm thấy <b>{m.expected}</b></li>)}</ul></div> : <p className="text-sm font-medium text-green-800">Không có ca trượt.</p>}
        </div>
      )}
      {runs.length > 1 && <details className="text-sm"><summary className="cursor-pointer font-medium">So sánh các lần chạy ({runs.length})</summary><table className="mt-2 w-full text-left"><thead><tr><th className="p-1">Lúc</th><th className="p-1">k</th><th className="p-1">Recall@k</th><th className="p-1">MRR</th><th className="p-1">Trượt</th></tr></thead><tbody>{[...runs].reverse().map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="p-1">{formatDateTime(r.at)}</td><td className="p-1">{r.k}</td><td className="p-1">{pct(r.recallAtK)}</td><td className="p-1">{r.mrr.toFixed(2)}</td><td className="p-1">{r.misses.length}</td></tr>)}</tbody></table></details>}
    </section>
  )
}
