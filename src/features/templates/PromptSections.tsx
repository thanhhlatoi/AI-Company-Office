/** Prompt của mẫu tách theo tiêu đề `# …` kèm chú thích của từng phần (8 phần). Nội dung hiện dạng chữ, không phải markdown/HTML. */
export function PromptSections({ prompt, notes }: { prompt: string; notes: { section: string; note: string }[] }) {
  const parts = prompt.split(/^# /m).map((x) => x.trimEnd()).filter(Boolean).map((chunk) => { const [head, ...rest] = chunk.split('\n'); return { head: head.trim(), body: rest.join('\n').trim() } })
  const hasHeads = prompt.trimStart().startsWith('# ')
  if (!hasHeads) return <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-xs">{prompt}</pre>
  return (
    <ol aria-label="Các phần của prompt" className="max-h-96 space-y-2 overflow-y-auto">
      {parts.map((p, i) => { const note = notes.find((n) => n.section.toLowerCase() === p.head.toLowerCase())?.note; return (
        <li key={i} className="rounded-lg border border-slate-200 p-2"><p className="flex flex-wrap items-baseline gap-2"><b className="text-sm">{i + 1}. {p.head}</b>{note && <span className="text-xs text-slate-700">{note}</span>}</p><pre className="mt-1 whitespace-pre-wrap break-words text-xs">{p.body}</pre></li>
      ) })}
    </ol>
  )
}
