import { useMoney } from '../../lib/useMoney'
import type { Message } from '../../types/history'
import { PlainText } from './highlight'
import { SafeMarkdown } from './SafeMarkdown'

const ROLE = { USER: 'Người dùng', ASSISTANT: 'AI', TOOL: 'Công cụ' } as const
const BUBBLE = { USER: 'ml-auto border-brand/30 bg-brand/10', ASSISTANT: 'border-slate-200 bg-white', TOOL: 'border-slate-300 bg-slate-50' } as const
const TIME = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

/** Một tin: bong bóng theo vai trò, mốc giờ, token/chi phí khi rê chuột hoặc focus; công cụ thu gọn (tham số đã che). */
export function MessageItem({ m, q, hit, current }: { m: Message; q: string; hit: boolean; current: boolean }) {
  const money = useMoney()
  return (
    <li id={`msg-${m.id}`} tabIndex={0} aria-label={`${ROLE[m.role]} lúc ${TIME.format(new Date(m.createdAt))}${m.toolName ? `, công cụ ${m.toolName}` : ''}`}
      className={`group max-w-[46rem] rounded-card outline-none [content-visibility:auto] [contain-intrinsic-size:auto_96px] focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand/40 ${m.role === 'USER' ? 'ml-auto' : ''} ${current ? 'ring-4 ring-inset ring-yellow-300' : ''}`}>
      <div className="mb-0.5 flex items-center gap-2 px-1 text-xs text-slate-600">
        <b className="text-slate-700">{ROLE[m.role]}</b><time dateTime={m.createdAt}>{TIME.format(new Date(m.createdAt))}</time>
        {m.truncated && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-900">Tin này bị cắt bớt</span>}
        <span className="ml-auto tabular-nums opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100" title="Token và chi phí của tin này">{m.tokens.toLocaleString('vi-VN')} token · {money(m.costMicro)}</span>
      </div>
      <div className={`rounded-card border p-3 text-sm ${BUBBLE[m.role]}`}>
        {m.role === 'TOOL' ? (
          <details open={hit || undefined}>
            <summary className="cursor-pointer font-mono text-xs font-bold">🔧 {m.toolName ?? 'công cụ'}</summary>
            <div className="mt-2 space-y-2">
              <section><h4 className="text-xs font-semibold text-slate-600">Tham số (đã che bí mật)</h4><pre className="mt-0.5 whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-xs"><PlainText text={JSON.stringify(m.toolArgs ?? {}, null, 2)} q={q} /></pre></section>
              <section><h4 className="text-xs font-semibold text-slate-600">Kết quả</h4><pre className="mt-0.5 whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-xs"><PlainText text={m.content} q={q} /></pre></section>
            </div>
          </details>
        ) : <SafeMarkdown text={m.content} q={q} />}
      </div>
    </li>
  )
}
