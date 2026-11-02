import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import { postPause, postResume } from '../../api/work'
import { useNow } from '../approvals/hooks'
import { useUiStore } from '../../store/uiStore'
import { useWorkStore } from '../../store/workStore'

/** Chỉ số hệ thống: đang chạy, đang chờ, chờ duyệt, lỗi trong ngày. */
export function useSystemStats() {
  const tasks = useWorkStore((s) => s.tasksById)
  const approvals = useWorkStore((s) => s.approvalsById)
  const now = useNow(60_000) // đổi ngày thì "lỗi hôm nay" tự về 0
  return useMemo(() => {
    const today = new Date(now).toDateString()
    const all = Object.values(tasks)
    return {
      running: all.filter((t) => t.status === 'RUNNING').length,
      queued: all.filter((t) => t.status === 'QUEUED').length,
      awaiting: Object.values(approvals).filter((a) => a.status === 'PENDING').length,
      failedToday: all.filter((t) => t.status === 'FAILED' && new Date(t.updatedAt).toDateString() === today).length,
    }
  }, [tasks, approvals, now])
}

/** Dừng / tiếp tục: KHÔNG optimistic, chỉ đổi sau khi BE xác nhận (event system.state_changed đến sau là vô hại). */
export function useSystemControl() {
  const toast = useUiStore.getState().toast
  const apply = (s: { state: 'RUNNING' | 'PAUSED'; reason?: string | null }) => useWorkStore.getState().setSystem(s.state, s.reason)
  const pause = useMutation({ mutationFn: (reason?: string) => postPause(reason), onSuccess: (s) => { apply(s); toast('Đã dừng tất cả') }, onError: () => toast('Không dừng được, thử lại', 'error') })
  const resume = useMutation({ mutationFn: () => postResume(), onSuccess: (s) => { apply(s); toast('Hệ thống chạy lại') }, onError: () => toast('Không tiếp tục được, thử lại', 'error') })
  return { pause, resume }
}
