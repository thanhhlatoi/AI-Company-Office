import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { estimateTokens } from '../../lib/text'
import type { Agent } from '../../types'
import type { LintIssue } from '../../types/studio'
import { useLint, useSavePrompt } from './mutations'

const SEV = { error: { Icon: CircleAlert, cls: 'text-red-700', label: 'Lỗi' }, warning: { Icon: TriangleAlert, cls: 'text-amber-800', label: 'Cảnh báo' }, info: { Icon: Info, cls: 'text-sky-800', label: 'Gợi ý' } } as const
const LH = 20 // chiều cao dòng (px): gutter và textarea phải khớp nhau

/** Soạn system prompt: số dòng, đếm từ / token ước lượng, kiểm tra (PromptLinter) hiện theo dòng, lưu thành phiên bản mới. */
export function PromptEditor({ agent }: { agent: Agent }) {
  const [text, setText] = useState(agent.systemPrompt)
  const [note, setNote] = useState('')
  const [issues, setIssues] = useState<LintIssue[] | null>(null)
  const area = useRef<HTMLTextAreaElement>(null), gutter = useRef<HTMLDivElement>(null)
  const lint = useLint(), save = useSavePrompt(agent.id)
  const lines = text.split('\n'), dirty = text !== agent.systemPrompt
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const worst = (n: number) => issues?.filter((i) => i.line === n).sort((a, b) => (a.severity === 'error' ? -1 : b.severity === 'error' ? 1 : 0))[0]

  const jump = (line: number) => {
    const el = area.current
    if (!el) return
    const start = lines.slice(0, line - 1).reduce((s, l) => s + l.length + 1, 0)
    el.focus(); el.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0)); el.scrollTop = Math.max(0, (line - 3) * LH)
  }
  return (
    <section aria-label="Soạn system prompt" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">System prompt</h3>
        <p className="text-xs text-slate-700" aria-live="polite">{lines.length} dòng · {words} từ · ≈ {estimateTokens(text)} token</p>
      </div>
      <div className="flex overflow-hidden rounded-lg border border-slate-300 focus-within:border-brand">
        <div ref={gutter} aria-hidden className="w-12 shrink-0 select-none overflow-hidden bg-slate-100 py-2 pr-1 text-right font-mono text-xs text-slate-700">
          {lines.map((_, i) => { const it = worst(i + 1); return <div key={i} style={{ height: LH, lineHeight: `${LH}px` }} className={it ? SEV[it.severity].cls : ''}>{it ? '●' : ''} {i + 1}</div> })}
        </div>
        <textarea
          ref={area} aria-label="System prompt" value={text} wrap="off" spellCheck={false} rows={14}
          onChange={(e) => { setText(e.target.value); setIssues(null) }}
          onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop }}
          style={{ lineHeight: `${LH}px` }} className="min-w-0 flex-1 resize-y overflow-auto whitespace-pre bg-white px-2 py-2 font-mono text-xs focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={lint.isPending || text.trim().length < 10} onClick={() => lint.mutate(text, { onSuccess: (r) => setIssues(r.issues) })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">{lint.isPending ? 'Đang kiểm tra…' : 'Kiểm tra prompt'}</button>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} aria-label="Ghi chú phiên bản" placeholder="Ghi chú phiên bản (tuỳ chọn)" className="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <button disabled={!dirty || save.isPending || text.trim().length < 10} onClick={() => save.mutate({ prompt: text, note }, { onSuccess: () => setNote('') })} className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Đang lưu…' : 'Lưu phiên bản mới'}</button>
        {dirty && <button onClick={() => { setText(agent.systemPrompt); setIssues(null) }} className="text-sm underline">Bỏ thay đổi</button>}
      </div>
      {issues && (
        issues.length === 0
          ? <p role="status" className="rounded-lg bg-green-50 p-2 text-sm text-green-900">Không thấy vấn đề nào.</p>
          : <ul role="status" aria-label="Kết quả kiểm tra prompt" className="space-y-1">
              {issues.map((it, i) => { const { Icon, cls, label } = SEV[it.severity]; return (
                <li key={i}><button onClick={() => jump(it.line)} className="flex w-full items-start gap-2 rounded-lg border border-slate-200 p-2 text-left text-sm hover:bg-slate-50">
                  <Icon size={16} className={`mt-0.5 shrink-0 ${cls}`} aria-hidden /><span><b className={cls}>{label}</b> · dòng {it.line}: {it.message}</span>
                </button></li>
              ) })}
            </ul>
      )}
    </section>
  )
}
