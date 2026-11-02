import { CornerDownRight } from 'lucide-react'
import { useState } from 'react'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Modal } from '../../components/Modal'
import { loadSnapshot } from '../../realtime/eventSync'
import { useWorkStore } from '../../store/workStore'
import type { Priority, Task } from '../../types'
import { useNow } from '../approvals/hooks'
import { PriorityBadge } from '../goals/PriorityBadge'
import { PRIORITY_STYLE } from '../goals/style'
import { useAgentQueue, useCancelTask, useRetryTask, useSetPriority } from './hooks'

function fmtWait(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return s < 60 ? `${s} giây` : s < 3600 ? `${Math.floor(s / 60)} phút` : `${Math.floor(s / 3600)} giờ ${Math.floor((s % 3600) / 60)} phút`
}

/** Tab "Hàng đợi" trong panel agent: việc đang chạy, việc chờ theo thứ tự sẽ chạy, việc lỗi. Cập nhật realtime. */
export function AgentQueue({ agentId }: { agentId: string }) {
  const { running, queued, failed } = useAgentQueue(agentId)
  const tasksById = useWorkStore((s) => s.tasksById)
  const sync = useWorkStore((s) => s.sync)
  const paused = useWorkStore((s) => s.system.state === 'PAUSED')
  const cancel = useCancelTask()
  const retry = useRetryTask()
  const setPriority = useSetPriority()
  const now = useNow()
  const [confirm, setConfirm] = useState<Task | null>(null)

  if (sync === 'loading' && !running.length && !queued.length && !failed.length) return <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}</div>

  const titleOf = (id: string) => tasksById[id]?.title ?? id
  const item = (t: Task, pos?: number) => {
    const waiting = t.status === 'QUEUED' ? t.dependsOn.filter((d) => tasksById[d]?.status !== 'DONE') : []
    return (
      <li key={t.id} className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-start gap-2">
          {pos != null && <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold tabular-nums" aria-label={`Thứ ${pos}`}>{pos}</span>}
          <span className="min-w-0 flex-1 text-sm font-semibold">{t.title}</span>
          <PriorityBadge priority={t.priority} />
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {t.status === 'QUEUED' && <>Chờ {fmtWait(now - Date.parse(t.createdAt))}</>}
          {t.status === 'RUNNING' && <>Đang chạy {t.startedAt ? fmtWait(now - Date.parse(t.startedAt)) : ''}</>}
          {t.status === 'AWAITING_APPROVAL' && <span className="font-medium text-amber-700">Chờ bạn duyệt (bấm chuông)</span>}
          {t.status === 'WAITING_BUDGET' && <span className="font-medium text-amber-700">Chờ ngân sách</span>}
          {t.status === 'FAILED' && <span className="font-medium text-red-700">Lỗi: {t.error ?? 'không rõ'} · đã thử {t.attempts} lần</span>}
        </div>
        {waiting.length > 0 && <p className="mt-1 flex items-start gap-1 text-xs text-slate-600"><CornerDownRight size={12} className="mt-0.5 shrink-0" aria-hidden="true" />Chờ: {waiting.map(titleOf).join(', ')}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {t.status === 'QUEUED' && (
            <label className="flex items-center gap-1 text-xs text-slate-600">
              Ưu tiên
              <select aria-label={`Ưu tiên của ${t.title}`} value={t.priority} disabled={setPriority.isPending}
                onChange={(e) => setPriority.mutate({ id: t.id, value: e.target.value as Priority })}
                className="rounded border border-slate-300 px-1.5 py-1 text-xs">
                {(Object.keys(PRIORITY_STYLE) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_STYLE[p].label}</option>)}
              </select>
            </label>
          )}
          {t.status === 'FAILED' && <button onClick={() => retry.mutate({ id: t.id, value: undefined })} className="rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-dark">Thử lại</button>}
          {t.status !== 'FAILED' && (
            <button onClick={() => (t.status === 'RUNNING' || t.status === 'AWAITING_APPROVAL' ? setConfirm(t) : cancel.mutate({ id: t.id, value: undefined }))}
              className="ml-auto rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50">Huỷ</button>
          )}
        </div>
      </li>
    )
  }

  const section = (title: string, tasks: Task[], numbered = false) => tasks.length > 0 && (
    <section aria-label={title}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{title} ({tasks.length})</h3>
      <ul className="space-y-2">{tasks.map((t, i) => item(t, numbered ? i + 1 : undefined))}</ul>
    </section>
  )

  return (
    <div className="space-y-4">
      {sync === 'error' && <ErrorBanner message="Không tải được hàng đợi." onRetry={() => void loadSnapshot()} />}
      {paused && <p role="status" className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-900">Hệ thống đang tạm dừng: việc chờ sẽ chưa bắt đầu.</p>}
      {section('Đang chạy', running)}
      {section('Chờ chạy (theo thứ tự)', queued, true)}
      {section('Lỗi', failed)}
      {!running.length && !queued.length && !failed.length && <p className="py-6 text-center text-sm text-slate-600">Hàng đợi trống.</p>}
      {confirm && (
        <Modal title="Huỷ việc đang chạy?" onClose={() => setConfirm(null)}>
          <p className="text-sm">Huỷ <b>{confirm.title}</b>? Agent sẽ dừng việc này ngay.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Giữ lại</button>
            <button onClick={() => { cancel.mutate({ id: confirm.id, value: undefined }); setConfirm(null) }} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Huỷ việc</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
