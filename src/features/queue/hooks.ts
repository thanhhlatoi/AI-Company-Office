import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import { postCancelTask, postRetryTask, putTaskPriority } from '../../api/work'
import { useUiStore } from '../../store/uiStore'
import { useWorkStore } from '../../store/workStore'
import type { Priority, Task } from '../../types'

const RANK: Record<Priority, number> = { HIGH: 0, NORMAL: 1, LOW: 2 }
const put = (t: Task) => useWorkStore.getState().upsertTask(t)

/**
 * Hàng đợi của một agent: task đang chạy trên cùng, rồi các task chờ theo thứ tự SẼ chạy
 * (ưu tiên cao trước, cùng ưu tiên thì ai vào trước chạy trước), cuối cùng là task lỗi (để thử lại).
 */
export function useAgentQueue(agentId: string) {
  const ids = useWorkStore((s) => s.taskIdsByAgent[agentId])
  const byId = useWorkStore((s) => s.tasksById)
  return useMemo(() => {
    const own = (ids ?? []).map((id) => byId[id]).filter((t): t is Task => !!t)
    const time = (t: Task) => Date.parse(t.createdAt)
    return {
      running: own.filter((t) => t.status === 'RUNNING' || t.status === 'AWAITING_APPROVAL'),
      queued: own.filter((t) => t.status === 'QUEUED' || t.status === 'WAITING_BUDGET').sort((a, b) => RANK[a.priority] - RANK[b.priority] || time(a) - time(b)),
      failed: own.filter((t) => t.status === 'FAILED').sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    }
  }, [ids, byId])
}

/** Thao tác trên task: optimistic (đổi ngay trong store), hoàn tác và báo lỗi nếu BE từ chối. */
function useTaskMutation<V>(call: (id: string, v: V) => Promise<Task>, patch: (t: Task, v: V) => Partial<Task>, ok: string) {
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: V }) => call(id, value),
    onMutate: ({ id, value }) => {
      const prev = useWorkStore.getState().tasksById[id]
      if (prev) put({ ...prev, ...patch(prev, value) })
      return { prev }
    },
    onSuccess: (t) => { put(t); useUiStore.getState().toast(ok) },
    onError: (_e, _v, ctx) => { if (ctx?.prev) put(ctx.prev); useUiStore.getState().toast('Thất bại, đã hoàn tác', 'error') },
  })
}

export const useCancelTask = () => useTaskMutation<void>((id) => postCancelTask(id), () => ({ status: 'CANCELLED', error: 'Chủ đã huỷ' }), 'Đã huỷ việc')
export const useRetryTask = () => useTaskMutation<void>((id) => postRetryTask(id), () => ({ status: 'QUEUED', error: null }), 'Đã đưa vào hàng đợi để thử lại')
export const useSetPriority = () => useTaskMutation<Priority>(putTaskPriority, (_t, priority) => ({ priority }), 'Đã đổi ưu tiên')
