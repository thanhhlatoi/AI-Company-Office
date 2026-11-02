import { ArrowDown, CornerDownRight, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import type { Goal } from '../../types'
import { usePlanDecision } from './hooks'
import { layers } from './layers'
import { PriorityBadge } from './PriorityBadge'

const MANY_TASKS = 10 // kế hoạch dài hơn thì cảnh báo

/** Duyệt kế hoạch: các việc theo tầng phụ thuộc, người nhận, ưu tiên. Chỉ duyệt hoặc từ chối (không sửa). */
export function PlanReview({ goal }: { goal: Goal }) {
  const agents = useAgentStore((s) => s.agentsById)
  const departments = useDepartmentStore((s) => s.departmentsById)
  const decide = usePlanDecision()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const titleOf = new Map(goal.plan.map((p) => [p.key, p.title]))
  const steps = layers(goal.plan, (p) => p.key, (p) => p.dependsOn)
  const estimate = goal.plan.reduce((s, p) => s + (p.estimateTokens ?? 0), 0)
  const overBudget = goal.tokenBudget != null && estimate > goal.tokenBudget
  const busy = decide.isPending

  return (
    <section aria-label="Duyệt kế hoạch" className="space-y-4">
      <div role="status" className="rounded-card border border-amber-300 bg-amber-50 px-4 py-3 text-base">
        <b>Kế hoạch đang chờ bạn duyệt.</b> Chưa có việc nào chạy cho tới khi bạn duyệt.
      </div>
      {goal.plan.length > MANY_TASKS && (
        <p role="alert" className="flex items-center gap-2 rounded-card bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900"><TriangleAlert size={16} aria-hidden="true" />Kế hoạch có {goal.plan.length} việc, nhiều hơn mức thường gặp. Hãy xem kỹ.</p>
      )}
      {overBudget && (
        <p role="alert" className="flex items-center gap-2 rounded-card bg-red-100 px-4 py-2 text-sm font-medium text-red-900"><TriangleAlert size={16} aria-hidden="true" />Ước tính {estimate.toLocaleString('vi-VN')} token, vượt ngân sách {goal.tokenBudget?.toLocaleString('vi-VN')}.</p>
      )}
      {goal.plan.length === 0 && <p className="text-slate-600">Kế hoạch trống.</p>}

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i}>
            {i > 0 && <div className="flex items-center gap-1 py-1 text-xs font-medium text-slate-600"><ArrowDown size={14} aria-hidden="true" />Sau khi xong bước trước</div>}
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">Bước {i + 1}</h3>
            <ul className="space-y-2">
              {step.map((p) => {
                const a = agents[p.assigneeId]
                const d = a?.departmentId ? departments[a.departmentId] : undefined
                return (
                  <li key={p.key} className="rounded-card border border-slate-300 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 flex-1 text-base font-semibold">{p.title}</span>
                      <PriorityBadge priority={p.priority} />
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Avatar name={a?.name ?? '?'} color={a?.color ?? '#94a3b8'} size={24} />
                      <span className="font-medium">{a?.name ?? `Agent ${p.assigneeId}`}</span>
                      {d && <span className="text-slate-600"><span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: d.color }} />{d.name}</span>}
                      {p.estimateTokens != null && <span className="ml-auto text-xs text-slate-600">~{p.estimateTokens.toLocaleString('vi-VN')} token</span>}
                    </div>
                    {p.dependsOn.length > 0 && (
                      <p className="mt-2 flex items-start gap-1 text-sm text-slate-600"><CornerDownRight size={14} className="mt-0.5 shrink-0" aria-hidden="true" />Chờ: {p.dependsOn.map((k) => titleOf.get(k) ?? k).join(', ')}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>

      {!rejecting ? (
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => decide.mutate({ id: goal.id })} className="flex-1 rounded-lg bg-green-700 px-4 py-3 text-base font-semibold text-white hover:bg-green-800 disabled:opacity-50">
            {busy ? 'Đang gửi…' : 'Duyệt và chạy'}
          </button>
          <button disabled={busy} onClick={() => setRejecting(true)} className="flex-1 rounded-lg border-2 border-red-300 px-4 py-3 text-base font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Từ chối kèm lý do</button>
        </div>
      ) : (
        <form className="space-y-2 rounded-card bg-slate-100 p-3" onSubmit={(e) => { e.preventDefault(); if (reason.trim() && !busy) decide.mutate({ id: goal.id, reason: reason.trim() }) }}>
          <label htmlFor="plan-reject" className="block text-base font-medium">Lý do từ chối (bắt buộc)</label>
          <textarea id="plan-reject" autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-base focus:border-brand focus:outline-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={!reason.trim() || busy} className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-40">{busy ? 'Đang gửi…' : 'Từ chối kế hoạch'}</button>
            <button type="button" disabled={busy} onClick={() => setRejecting(false)} className="rounded-lg px-4 py-3 text-base hover:bg-white/60">Quay lại</button>
          </div>
        </form>
      )}
    </section>
  )
}
