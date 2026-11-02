import type { QueryClient } from '@tanstack/react-query'
import type { Task } from '../../types'

export const tasksKey = (agentId: string) => ['tasks', agentId] as const

/** Thêm/cập nhật task trong cache TanStack Query (mới nhất ở trên). Chỉ chạm cache đã tồn tại. */
export function upsertTask(qc: QueryClient, task: Task) {
  qc.setQueryData<Task[]>(tasksKey(task.agentId), (old) => {
    if (!old) return old
    return old.some((t) => t.id === task.id) ? old.map((t) => (t.id === task.id ? task : t)) : [task, ...old]
  })
}
