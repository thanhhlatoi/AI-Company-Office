import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { postApprovePlan, postCancelGoal, postGoal, postRejectPlan } from '../../api/work'
import { useUiStore } from '../../store/uiStore'
import { useWorkStore } from '../../store/workStore'
import type { Goal, Task } from '../../types'

/** Danh sách mục tiêu: mới nhất trước. */
export function useGoalList() {
  const byId = useWorkStore((s) => s.goalsById)
  return useMemo(() => Object.values(byId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [byId])
}

/** Task của một mục tiêu (theo chỉ mục trong store). */
export function useGoalTasks(goalId: string): Task[] {
  const ids = useWorkStore((s) => s.taskIdsByGoal[goalId])
  const byId = useWorkStore((s) => s.tasksById)
  return useMemo(() => (ids ?? []).map((id) => byId[id]).filter((t): t is Task => !!t), [ids, byId])
}

/** % hoàn thành tính trên các task chưa bị huỷ. */
export function progressOf(goal: Goal, tasks: Task[]) {
  const live = tasks.filter((t) => t.status !== 'CANCELLED')
  const done = live.filter((t) => t.status === 'DONE').length
  return { done, total: live.length, pct: goal.status === 'DONE' ? 100 : live.length ? Math.round((done / live.length) * 100) : 0 }
}

const put = (g: Goal) => useWorkStore.getState().upsertGoal(g)

/** Tạo mục tiêu rồi chuyển sang trang tiến độ. */
export function useCreateGoal() {
  const navigate = useNavigate()
  const ui = useUiStore.getState
  return useMutation({
    mutationFn: postGoal,
    onSuccess: (g) => { put(g); ui().closeComposer(); ui().toast('Đã tạo mục tiêu'); navigate(`/goals/${g.id}`) },
    onError: () => ui().toast('Tạo mục tiêu thất bại', 'error'),
  })
}

/** Duyệt / từ chối kế hoạch: KHÔNG optimistic (đổi giao diện sau khi BE xác nhận). */
export function usePlanDecision() {
  const toast = useUiStore.getState().toast
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => (reason === undefined ? postApprovePlan(id) : postRejectPlan(id, reason)),
    onSuccess: (g, { reason }) => { put(g); toast(reason === undefined ? 'Đã duyệt, mục tiêu bắt đầu chạy' : 'Đã từ chối kế hoạch') },
    onError: () => toast('Thao tác thất bại, kế hoạch vẫn đang chờ', 'error'),
  })
}

/** Huỷ mục tiêu: optimistic (đổi ngay), hoàn tác nếu BE báo lỗi. */
export function useCancelGoal() {
  const toast = useUiStore.getState().toast
  return useMutation({
    mutationFn: (id: string) => postCancelGoal(id),
    onMutate: (id) => {
      const prev = useWorkStore.getState().goalsById[id]
      if (prev) put({ ...prev, status: 'CANCELLED', finishedAt: new Date().toISOString() })
      return { prev }
    },
    onSuccess: (g) => { put(g); toast('Đã huỷ mục tiêu') },
    onError: (_e, _id, ctx) => { if (ctx?.prev) put(ctx.prev); toast('Huỷ thất bại, đã hoàn tác', 'error') },
  })
}
