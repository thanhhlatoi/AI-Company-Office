import { DOC_STAGES, type KnowledgeDoc } from '../../types/knowledge'
import { describeError } from './errors'

const LABEL = { EXTRACTING: 'Trích xuất', CHUNKING: 'Cắt đoạn', EMBEDDING: 'Nhúng', READY: 'Sẵn sàng' } as const

/** Thanh giai đoạn: Trích xuất → Cắt đoạn → Nhúng → Sẵn sàng; giai đoạn hiện tại có % (cập nhật realtime). Lỗi hiện tiếng Việt. */
export function DocStages({ d }: { d: KnowledgeDoc }) {
  if (d.status === 'FAILED') return <p role="alert" className="text-xs font-semibold text-red-800">Lỗi: {describeError(d.errorCode).text}</p>
  const at = d.status === 'UPLOADED' ? -1 : DOC_STAGES.indexOf(d.status as (typeof DOC_STAGES)[number])
  return (
    <ol aria-label={`Tiến trình: ${d.status === 'UPLOADED' ? 'đang chờ' : LABEL[d.status as keyof typeof LABEL]}`} className="flex flex-wrap items-center gap-1 text-xs">
      {DOC_STAGES.map((s, i) => {
        const done = i < at || d.status === 'READY', cur = i === at && d.status !== 'READY'
        return <li key={s} aria-current={cur ? 'step' : undefined} className={`rounded-full px-2 py-0.5 ${done ? 'bg-green-100 text-green-900' : cur ? 'bg-sky-100 font-semibold text-sky-950' : 'bg-slate-100 text-slate-700'}`}>{done ? '✓ ' : ''}{LABEL[s]}{cur && d.progressPct > 0 ? ` ${d.progressPct}%` : ''}</li>
      })}
      {d.status === 'UPLOADED' && <li className="text-slate-700">Đang chờ xử lý…</li>}
    </ol>
  )
}
