import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query'
import { getUnread, listNotifications, postMarkRead, postReadAll } from '../../api/biz'
import type { Notification } from '../../types/notify'

type Page = Awaited<ReturnType<typeof listNotifications>>
type Filter = { level?: string; type?: string; unread?: boolean }

export const useNotifications = (f: Filter) =>
  useInfiniteQuery({ queryKey: ['notifications', f], queryFn: ({ pageParam }) => listNotifications(f, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (p) => p.nextCursor ?? undefined })

export const useUnreadCount = () => useQuery({ queryKey: ['unread'], queryFn: getUnread, select: (d) => d.count })

/** Sửa mọi trang đã tải trong cache (đánh dấu đọc hiện ngay, không chờ tải lại). */
function patch(qc: QueryClient, fn: (n: Notification) => Notification) {
  qc.setQueriesData<InfiniteData<Page>>({ queryKey: ['notifications'] }, (d) => d && { ...d, pages: d.pages.map((p) => ({ ...p, items: p.items.map(fn) })) })
}

/** Đánh dấu đã đọc: optimistic, hoàn tác khi BE lỗi. */
export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postMarkRead,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notifications'] })
      const prev = qc.getQueriesData<InfiniteData<Page>>({ queryKey: ['notifications'] })
      const wasUnread = prev.some(([, d]) => d?.pages.some((p) => p.items.some((n) => n.id === id && !n.readAt)))
      const now = new Date().toISOString()
      patch(qc, (n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n))
      if (wasUnread) qc.setQueryData<{ count: number }>(['unread'], (c) => c && { count: Math.max(0, c.count - 1) })
      return { prev }
    },
    onError: (_e, _id, ctx) => { ctx?.prev.forEach(([k, d]) => qc.setQueryData(k, d)); void qc.invalidateQueries({ queryKey: ['unread'] }) },
  })
}

export function useReadAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postReadAll,
    onMutate: () => { const now = new Date().toISOString(); patch(qc, (n) => ({ ...n, readAt: n.readAt ?? now })); qc.setQueryData(['unread'], { count: 0 }) },
    onError: () => { void qc.invalidateQueries({ queryKey: ['notifications'] }); void qc.invalidateQueries({ queryKey: ['unread'] }) },
  })
}
