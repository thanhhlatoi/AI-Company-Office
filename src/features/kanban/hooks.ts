import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { getKanbanPage, getTask, getTaskHistory, postAssign, postMove, type KanbanFilters } from '../../api/biz'
import { ApiError } from '../../api/http'
import { useUiStore } from '../../store/uiStore'
import type { Task } from '../../types'
import { MoveErrorSchema, type KanbanColumnId, type KanbanPage } from '../../types/kanban'
import { REASON_TEXT, columnOf } from './columns'
import { reorderPages } from './reorder'

/** Một cột Kanban, cuộn vô hạn theo cursor (50 thẻ mỗi trang). Key bắt đầu bằng 'kanban' để sự kiện task.* làm mới cả bảng. */
export const useKanbanColumn = (column: KanbanColumnId, f: KanbanFilters) =>
  useInfiniteQuery({ queryKey: ['kanban', column, f], queryFn: ({ pageParam }) => getKanbanPage(column, f, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (p) => p.nextCursor ?? undefined })

export const useTask = (id: string | null) => useQuery({ queryKey: ['task', id], queryFn: () => getTask(id as string), enabled: !!id })
export const useTaskHistory = (id: string) => useQuery({ queryKey: ['task', id, 'history'], queryFn: () => getTaskHistory(id) })

export interface MoveVars { task: Task; toColumn: KanbanColumnId; beforeTaskId?: string | null }
const toast = (t: string, k?: 'success' | 'error') => useUiStore.getState().toast(t, k)
const OK_TEXT: Partial<Record<KanbanColumnId, string>> = { RUNNING: 'Đã bắt đầu chạy', FAILED_CANCELLED: 'Đã huỷ' }

/**
 * Di chuyển thẻ (POST /tasks/{id}/move với expectedVersion). BACKEND quyết định.
 * Chỉ ĐỔI THỨ TỰ trong cột Chờ là lạc quan (hoàn tác khi lỗi); các di chuyển khác chờ BE xác nhận rồi mới đổi cột.
 * 409 -> thẻ về chỗ cũ + toast giải thích theo reasonCode; STALE_VERSION tự tải lại cột.
 */
export function useMoveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ task, toColumn, beforeTaskId }: MoveVars) => postMove(task.id, { toColumn, beforeTaskId: beforeTaskId ?? null, expectedVersion: task.version }),
    onMutate: async ({ task, toColumn, beforeTaskId }) => {
      if (toColumn !== 'QUEUED' || columnOf(task.status) !== 'QUEUED') return { prev: [] as [readonly unknown[], InfiniteData<KanbanPage> | undefined][] }
      await qc.cancelQueries({ queryKey: ['kanban', 'QUEUED'] })
      const prev = qc.getQueriesData<InfiniteData<KanbanPage>>({ queryKey: ['kanban', 'QUEUED'] })
      qc.setQueriesData<InfiniteData<KanbanPage>>({ queryKey: ['kanban', 'QUEUED'] }, (d) => d && { ...d, pages: reorderPages(d.pages, task.id, beforeTaskId ?? null) })
      return { prev }
    },
    onError: (err, { task }, ctx) => {
      ctx?.prev.forEach(([k, d]) => qc.setQueryData(k, d))
      const reason = err instanceof ApiError ? MoveErrorSchema.safeParse(err.body) : null
      toast(reason?.success ? `"${task.title}": ${REASON_TEXT[reason.data.reasonCode]}` : 'Không chuyển được thẻ, thử lại', 'error')
    },
    onSuccess: (t, { task, toColumn }) => { const text = t.id !== task.id ? 'Đã tạo task mới để làm lại' : OK_TEXT[toColumn]; if (text) toast(text) },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ['kanban'] }); void qc.invalidateQueries({ queryKey: ['task'] }) },
  })
}

export function useAssign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, agentId }: { id: string; agentId: string }) => postAssign(id, agentId),
    onSuccess: () => toast('Đã đổi người phụ trách'),
    onError: () => toast('Không đổi được người phụ trách', 'error'),
    onSettled: () => { void qc.invalidateQueries({ queryKey: ['kanban'] }); void qc.invalidateQueries({ queryKey: ['task'] }) },
  })
}
