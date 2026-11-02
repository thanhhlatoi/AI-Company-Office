import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PANEL_CLASS } from '../../components/panelStyles'
import { formatDateTime } from '../../lib/time'
import { useMoney } from '../../lib/useMoney'
import { useWorkStore } from '../../store/workStore'
import { TaskDetail } from '../goals/TaskDetail'
import { TASK_STYLE } from '../goals/style'
import { useProjects } from '../projects/hooks'
import { useCancelTask, useRetryTask } from '../queue/hooks'
import { cancellable, redoable } from './columns'
import { useMoveTask, useTask, useTaskHistory } from './hooks'

/** Ngăn chi tiết task (mở bằng ?task=ID): mô tả, kết quả, lỗi, số lần thử, lịch sử trạng thái, chi phí, liên kết hội thoại, hành động. */
export function TaskDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useTask(id)
  const hist = useTaskHistory(id)
  const money = useMoney()
  const qc = useQueryClient()
  const projects = useProjects({}).data
  const goal = useWorkStore((s) => (q.data?.goalId ? s.goalsById[q.data.goalId]?.title : undefined))
  const cancel = useCancelTask(), retry = useRetryTask(), move = useMoveTask()
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['kanban'] }); void qc.invalidateQueries({ queryKey: ['task', id] }) }
  const t = q.data
  return (
    <aside aria-label="Chi tiết task" className={PANEL_CLASS}>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {q.isLoading && <div className="h-40 animate-pulse rounded-card bg-slate-200" aria-busy="true" />}
        {q.isError && <p role="alert" className="rounded-card bg-red-50 p-3 text-sm text-red-800">Không tải được task này. <button onClick={() => void q.refetch()} className="underline">Thử lại</button> · <button onClick={onClose} className="underline">Đóng</button></p>}
        {t && (
          <>
            <TaskDetail task={t} onClose={onClose} />
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 rounded-card border border-slate-200 bg-white p-3 text-sm">
              <dt className="text-slate-600">Chi phí</dt><dd className="tabular-nums">{money(t.costMicro)}</dd>
              <dt className="text-slate-600">Dự án</dt><dd>{projects?.find((p) => p.id === t.projectId)?.name ?? '—'}</dd>
              <dt className="text-slate-600">Mục tiêu</dt><dd>{goal ?? '—'}</dd>
              <dt className="text-slate-600">Phiên bản</dt><dd className="tabular-nums">{t.version}</dd>
            </dl>
            {t.input && <section aria-label="Mô tả"><h4 className="mb-1 text-sm font-semibold">Mô tả</h4><p className="whitespace-pre-wrap rounded-card bg-slate-50 p-3 text-sm">{t.input}</p></section>}
            <section aria-label="Lịch sử trạng thái">
              <h4 className="mb-1 text-sm font-semibold">Lịch sử trạng thái</h4>
              {hist.isLoading && <div className="h-10 animate-pulse rounded bg-slate-100" />}
              <ol className="space-y-1 text-sm">
                {hist.data?.map((h, i) => <li key={i} className="flex gap-2"><time className="w-36 shrink-0 text-xs text-slate-600">{formatDateTime(h.at)}</time><span className="font-medium">{TASK_STYLE[h.status as keyof typeof TASK_STYLE]?.label ?? h.status}</span>{h.note && <span className="text-slate-600">· {h.note}</span>}</li>)}
              </ol>
            </section>
            <Link to={`/history?task=${t.id}`} className="block text-sm text-brand underline">Xem hội thoại của task này</Link>
            <div className="flex flex-wrap gap-2 pb-2">
              {t.status === 'FAILED' && <button onClick={() => retry.mutate({ id: t.id, value: undefined }, { onSettled: refresh })} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">Thử lại</button>}
              {redoable(t) && <button onClick={() => move.mutate({ task: t, toColumn: 'QUEUED' })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Làm lại (tạo task mới)</button>}
              {cancellable(t) && <button onClick={() => cancel.mutate({ id: t.id, value: undefined }, { onSettled: refresh })} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Huỷ</button>}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
