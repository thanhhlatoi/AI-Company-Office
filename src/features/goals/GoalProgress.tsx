import { ArrowDown, CornerDownRight } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { Modal } from '../../components/Modal'
import { useAgentStore } from '../../store/agentStore'
import type { Goal, Task } from '../../types'
import { useNow } from '../approvals/hooks'
import { progressOf, useCancelGoal, useGoalTasks } from './hooks'
import { layers } from './layers'
import { PriorityBadge } from './PriorityBadge'
import { GOAL_STYLE, TASK_STYLE, isTerminalGoal } from './style'
import { TaskDetail } from './TaskDetail'

function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h ? `${h} giờ ${m} phút` : m ? `${m} phút ${s % 60} giây` : `${s} giây`
}

function Bar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className="h-3 rounded-full bg-slate-200">
      <div className="h-3 rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  )
}

/** Tiến độ một mục tiêu: thanh %, token, thời gian, cây task đổi màu realtime, chi tiết task. */
export function GoalProgress({ goal }: { goal: Goal }) {
  const tasks = useGoalTasks(goal.id)
  const agents = useAgentStore((s) => s.agentsById)
  const cancel = useCancelGoal()
  const now = useNow()
  const [selected, setSelected] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const { done, total, pct } = progressOf(goal, tasks)
  const st = GOAL_STYLE[goal.status]
  const live = !isTerminalGoal(goal.status)
  const elapsed = (goal.finishedAt ? Date.parse(goal.finishedAt) : now) - Date.parse(goal.createdAt)
  const budgetPct = goal.tokenBudget ? (goal.tokensUsed / goal.tokenBudget) * 100 : 0
  const titleOf = new Map(tasks.map((t) => [t.id, t.title]))
  const steps = layers(tasks, (t) => t.id, (t) => t.dependsOn)
  const current = tasks.find((t) => t.id === selected)

  const row = (t: Task) => {
    const s = TASK_STYLE[t.status]
    const a = agents[t.agentId]
    const waiting = t.status === 'QUEUED' ? t.dependsOn.filter((d) => tasks.find((x) => x.id === d)?.status !== 'DONE') : []
    return (
      <li key={t.id}>
        <button onClick={() => setSelected(t.id === selected ? null : t.id)} aria-pressed={t.id === selected}
          className={`w-full rounded-card border-2 bg-white p-3 text-left hover:bg-slate-50 ${t.id === selected ? 'ring-4 ring-brand/20' : ''}`} style={{ borderColor: s.color }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`min-w-0 flex-1 text-base font-semibold ${t.status === 'CANCELLED' ? 'text-slate-600 line-through' : ''}`}>{t.title}</span>
            <PriorityBadge priority={t.priority} />
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: s.soft, color: s.color }}>{s.label}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            <span className="flex items-center gap-1.5"><Avatar name={a?.name ?? '?'} color={a?.color ?? '#94a3b8'} size={20} />{a?.name ?? `Agent ${t.agentId}`}</span>
            {t.attempts > 1 && <span className="font-medium text-amber-700">Lần thử {t.attempts}</span>}
            {t.tokensUsed > 0 && <span>{t.tokensUsed.toLocaleString('vi-VN')} token</span>}
            {t.error && <span className="font-medium text-red-700">{t.error}</span>}
          </div>
          {waiting.length > 0 && <p className="mt-1 flex items-start gap-1 text-sm text-slate-600"><CornerDownRight size={14} className="mt-0.5 shrink-0" aria-hidden="true" />Chờ: {waiting.map((d) => titleOf.get(d) ?? d).join(', ')}</p>}
        </button>
      </li>
    )
  }

  return (
    <section aria-label="Tiến độ mục tiêu" className="space-y-4">
      <div className="space-y-3 rounded-card border border-slate-300 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: st.soft, color: st.color }}>{st.label}</span>
          <span className="text-sm text-slate-600">Đã chạy {fmtDuration(elapsed)}</span>
          {live && <button onClick={() => setConfirming(true)} disabled={cancel.isPending} className="ml-auto rounded-lg border-2 border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Huỷ mục tiêu</button>}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm"><span>Tiến độ: {done}/{total} việc</span><b className="tabular-nums">{pct}%</b></div>
          <Bar pct={pct} color={goal.status === 'FAILED' ? '#dc2626' : '#16a34a'} label="Tiến độ" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>Token: {goal.tokensUsed.toLocaleString('vi-VN')}{goal.tokenBudget ? ` / ${goal.tokenBudget.toLocaleString('vi-VN')}` : ' (không giới hạn)'}</span>
            {goal.tokenBudget ? <b className={`tabular-nums ${budgetPct >= 100 ? 'text-red-700' : ''}`}>{Math.round(budgetPct)}%</b> : null}
          </div>
          {goal.tokenBudget ? <Bar pct={budgetPct} color={budgetPct >= 90 ? '#dc2626' : '#2563eb'} label="Ngân sách token" /> : null}
        </div>
      </div>

      {tasks.length === 0 ? <p className="text-slate-600">Chưa có việc nào được tạo.</p> : (
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i}>
                {i > 0 && <div className="flex items-center gap-1 py-1 text-xs font-medium text-slate-600"><ArrowDown size={14} aria-hidden="true" />Sau khi xong bước trước</div>}
                <ul className="space-y-2">{step.map(row)}</ul>
              </li>
            ))}
          </ol>
          {current && <div className="xl:sticky xl:top-0 xl:self-start"><TaskDetail task={current} onClose={() => setSelected(null)} /></div>}
        </div>
      )}

      {confirming && (
        <Modal title="Huỷ mục tiêu?" onClose={() => setConfirming(false)}>
          <p className="text-sm">Huỷ <b>{goal.title}</b>? Các việc chưa xong sẽ bị dừng và các yêu cầu duyệt đang chờ sẽ bị từ chối. Không thể hoàn tác.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setConfirming(false)} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Giữ lại</button>
            <button onClick={() => { cancel.mutate(goal.id); setConfirming(false) }} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Huỷ mục tiêu</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
