import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { formatDateTime } from '../../lib/time'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useWorkStore } from '../../store/workStore'
import type { Approval } from '../../types'
import { ArgsPreview } from './ArgsPreview'
import { useDecide, useNow } from './hooks'
import { CONFIRM_WORD, RISK, isConfirmWord } from './risk'

const STATUS_TEXT = { APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', EXPIRED: 'Hết hạn', PENDING: 'Đang chờ' } as const
const STATUS_COLOR = { APPROVED: 'text-green-700', REJECTED: 'text-red-700', EXPIRED: 'text-slate-600', PENDING: 'text-amber-700' } as const

function fmtLeft(ms: number) {
  if (ms >= 3600_000) return `${Math.floor(ms / 3600_000)} giờ ${Math.floor((ms % 3600_000) / 60_000)} phút`
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

type Mode = 'view' | 'confirm' | 'reject'

export function ApprovalCard({ approval: a, focused }: { approval: Approval; focused: boolean }) {
  const agent = useAgentStore((s) => s.agentsById[a.agentId])
  const dept = useDepartmentStore((s) => (agent?.departmentId ? s.departmentsById[agent.departmentId] : undefined))
  const goal = useWorkStore((s) => (a.goalId ? s.goalsById[a.goalId] : undefined))
  const task = useWorkStore((s) => (a.taskId ? s.tasksById[a.taskId] : undefined))
  const decide = useDecide()
  const now = useNow()
  const [mode, setMode] = useState<Mode>('view')
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')

  const risk = RISK[a.riskType]
  const pending = a.status === 'PENDING'
  const left = a.expiresAt ? Date.parse(a.expiresAt) - now : null
  const expired = left != null && left <= 0
  const busy = decide.isPending
  const canAct = pending && !expired && !busy
  const submitApprove = () => decide.mutate({ id: a.id, approved: true }, { onSuccess: () => setMode('view') })
  const submitReject = () => decide.mutate({ id: a.id, approved: false, reason: reason.trim() })

  return (
    <article
      id={`approval-${a.id}`}
      aria-label={`Yêu cầu ${risk.label} của ${agent?.name ?? 'agent'}`}
      className={`rounded-card border-2 bg-white p-4 shadow-card ${focused ? 'ring-4 ring-brand/30' : ''}`}
      style={{ borderColor: pending ? risk.color : '#cbd5e1' }}
    >
      <header className="flex items-start gap-3">
        <Avatar name={agent?.name ?? '?'} color={agent?.color ?? '#94a3b8'} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold leading-tight">{agent?.name ?? `Agent ${a.agentId}`}</div>
          <div className="text-sm text-slate-600">
            {dept && <><span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: dept.color }} />{dept.name} · </>}
            {agent && <Link to={dept ? `/department/${dept.slug}/agent/${agent.id}` : '/company'} className="text-brand underline">Mở agent</Link>}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-bold" style={{ background: risk.soft, color: risk.color }}>
          {a.riskType !== 'EXTERNAL' && <TriangleAlert size={16} aria-hidden="true" />}{risk.label}
        </span>
      </header>

      {(goal || task || a.title) && (
        <p className="mt-3 text-base">
          {goal && <><span className="text-slate-600">Mục tiêu:</span> <b>{goal.title}</b><br /></>}
          <span className="text-slate-600">Việc:</span> {task?.title ?? a.title}
        </p>
      )}

      <div className="mt-3"><ArgsPreview action={a.action} args={a.argsSnapshot} /></div>
      {pending && <p className="mt-2 text-sm font-medium" style={{ color: risk.color }}>{risk.hint}</p>}

      {pending ? (
        <>
          {left != null && (
            <p className={`mt-2 text-sm ${expired || left < 60_000 ? 'font-semibold text-red-700' : 'text-slate-600'}`} aria-live="off">
              {expired ? 'Đã hết hạn, BE sẽ tự từ chối.' : `Còn ${fmtLeft(left)} trước khi hết hạn`}
            </p>
          )}

          {mode === 'view' && (
            <div className="mt-3 flex gap-2">
              <button disabled={!canAct} onClick={() => (risk.confirm ? setMode('confirm') : submitApprove())}
                className="flex-1 rounded-lg bg-green-700 px-4 py-3 text-base font-semibold text-white hover:bg-green-800 disabled:opacity-50">
                {busy ? 'Đang gửi…' : 'Duyệt'}
              </button>
              <button disabled={!canAct} onClick={() => setMode('reject')}
                className="flex-1 rounded-lg border-2 border-red-300 px-4 py-3 text-base font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                Từ chối
              </button>
            </div>
          )}

          {mode === 'confirm' && (
            <form className="mt-3 space-y-2 rounded-card p-3" style={{ background: risk.soft }}
              onSubmit={(e) => { e.preventDefault(); if (isConfirmWord(typed) && canAct) submitApprove() }}>
              <label className="block text-base font-medium" htmlFor={`confirm-${a.id}`}>
                Xác nhận lần hai. Gõ <b>{CONFIRM_WORD}</b> để {a.riskType === 'MONEY' ? 'chi tiền' : 'thực hiện'}:
              </label>
              <input id={`confirm-${a.id}`} autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
                className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-base focus:border-brand focus:outline-none" />
              <div className="flex gap-2">
                <button type="submit" disabled={!isConfirmWord(typed) || !canAct}
                  className="flex-1 rounded-lg bg-green-700 px-4 py-3 text-base font-semibold text-white hover:bg-green-800 disabled:opacity-40">
                  {busy ? 'Đang gửi…' : 'Xác nhận duyệt'}
                </button>
                <button type="button" onClick={() => { setMode('view'); setTyped('') }} disabled={busy} className="rounded-lg px-4 py-3 text-base hover:bg-white/60">Quay lại</button>
              </div>
            </form>
          )}

          {mode === 'reject' && (
            <form className="mt-3 space-y-2 rounded-card bg-slate-100 p-3"
              onSubmit={(e) => { e.preventDefault(); if (reason.trim() && canAct) submitReject() }}>
              <label className="block text-base font-medium" htmlFor={`reason-${a.id}`}>Lý do từ chối (bắt buộc)</label>
              <textarea id={`reason-${a.id}`} autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-base focus:border-brand focus:outline-none" />
              <div className="flex gap-2">
                <button type="submit" disabled={!reason.trim() || !canAct}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-40">
                  {busy ? 'Đang gửi…' : 'Từ chối'}
                </button>
                <button type="button" onClick={() => setMode('view')} disabled={busy} className="rounded-lg px-4 py-3 text-base hover:bg-white/60">Quay lại</button>
              </div>
            </form>
          )}
          {decide.isError && <p role="alert" className="mt-2 text-sm font-medium text-red-700">Không gửi được tới BE. Yêu cầu vẫn đang chờ, hãy thử lại.</p>}
        </>
      ) : (
        <p className="mt-3 text-base">
          <b className={STATUS_COLOR[a.status]}>{STATUS_TEXT[a.status]}</b>
          {a.decidedAt && <span className="text-slate-600"> · {formatDateTime(a.decidedAt)}</span>}
          {a.decisionReason && <><br /><span className="text-slate-600">Lý do:</span> {a.decisionReason}</>}
        </p>
      )}
    </article>
  )
}
