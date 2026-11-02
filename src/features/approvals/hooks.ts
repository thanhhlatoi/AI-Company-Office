import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { approve, reject } from '../../api/approvals'
import { useRealtimeStore } from '../../store/realtimeStore'
import { useUiStore } from '../../store/uiStore'
import { useWorkStore } from '../../store/workStore'

/** Chờ duyệt (cũ nhất trước) và lịch sử (mới quyết định nhất trước). */
export function useApprovalLists() {
  const byId = useWorkStore((s) => s.approvalsById)
  return useMemo(() => {
    const all = Object.values(byId)
    const time = (iso?: string | null) => (iso ? Date.parse(iso) : 0)
    return {
      pending: all.filter((a) => a.status === 'PENDING').sort((a, b) => time(a.createdAt) - time(b.createdAt)),
      history: all.filter((a) => a.status !== 'PENDING').sort((a, b) => time(b.decidedAt) - time(a.decidedAt)),
    }
  }, [byId])
}

/** Số yêu cầu đang chờ (cho chuông). */
export const usePendingCount = () => useWorkStore((s) => Object.values(s.approvalsById).filter((a) => a.status === 'PENDING').length)

/** Đồng hồ nhảy mỗi `ms` để đếm ngược thời hạn. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

/**
 * Duyệt / từ chối. KHÔNG optimistic: giao diện chỉ đổi sau khi BE trả lời thành công
 * (event `approval.resolved` đến sau đó là vô hại vì áp lại cùng kết quả).
 */
export function useDecide() {
  const toast = useUiStore((s) => s.toast)
  return useMutation({
    mutationFn: ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) => (approved ? approve(id) : reject(id, reason ?? '')),
    onSuccess: (_r, { id, approved, reason }) => {
      useWorkStore.getState().resolveApproval(id, approved ? 'APPROVED' : 'REJECTED', reason)
      useRealtimeStore.getState().resolveApproval(id) // hạ tay nhân vật ngay
      toast(approved ? 'Đã duyệt' : 'Đã từ chối')
    },
    onError: (_e, { approved }) => toast(approved ? 'Duyệt thất bại, thử lại' : 'Từ chối thất bại, thử lại', 'error'),
  })
}
