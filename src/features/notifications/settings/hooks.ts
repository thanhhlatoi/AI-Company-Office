import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteChannel, getNotifySettings, listDeliveries, postChannelTest, postEmail, postEmailVerify, postResend, postTelegramLink, putNotifySettings } from '../../../api/biz'
import { useUiStore } from '../../../store/uiStore'
import type { NotificationSettings } from '../../../types/notify'

const KEY = ['notify-settings']
const toast = (text: string, kind?: 'success' | 'error') => useUiStore.getState().toast(text, kind)

/** Cài đặt; khi đang chờ ghép Telegram thì hỏi lại mỗi 3 giây để tự phát hiện "đã ghép xong". */
export const useNotifySettings = () =>
  useQuery({ queryKey: KEY, queryFn: getNotifySettings, refetchInterval: (q) => (q.state.data?.telegram.status === 'PENDING' ? 3000 : false) })

type Saved = Pick<NotificationSettings, 'rules' | 'quiet' | 'digest'>
/** Lưu quy tắc / giờ yên tĩnh / tóm tắt: optimistic (công tắc đổi ngay), hoàn tác nếu BE lỗi. */
export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (_patch: Partial<Saved>) => { // onMutate đã ghi patch vào cache nên đọc lại từ cache là bản mới nhất
      const cur = qc.getQueryData<NotificationSettings>(KEY) as NotificationSettings
      return putNotifySettings({ rules: cur.rules, quiet: cur.quiet, digest: cur.digest })
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = qc.getQueryData<NotificationSettings>(KEY)
      qc.setQueryData<NotificationSettings>(KEY, (s) => s && { ...s, ...patch })
      return { prev }
    },
    onError: (_e, _p, ctx) => { qc.setQueryData(KEY, ctx?.prev); toast('Không lưu được, đã hoàn tác', 'error') },
    onSuccess: (s) => qc.setQueryData(KEY, s),
  })
}

const refresh = (qc: ReturnType<typeof useQueryClient>) => Promise.all([qc.invalidateQueries({ queryKey: KEY }), qc.invalidateQueries({ queryKey: ['deliveries'] })])

export function useChannel(channel: 'telegram' | 'email') {
  const qc = useQueryClient()
  return {
    test: useMutation({ mutationFn: () => postChannelTest(channel), onSuccess: (d) => { toast(d.status === 'SENT' ? 'Đã gửi tin thử' : `Gửi thử thất bại: ${d.error ?? ''}`, d.status === 'SENT' ? 'success' : 'error'); void refresh(qc) }, onError: () => toast('Gửi thử thất bại', 'error') }),
    unlink: useMutation({ mutationFn: () => deleteChannel(channel), onSuccess: () => { toast('Đã gỡ kết nối'); void refresh(qc) }, onError: () => toast('Gỡ kết nối thất bại', 'error') }),
  }
}
export const useTelegramLink = () => { const qc = useQueryClient(); return useMutation({ mutationFn: postTelegramLink, onSuccess: () => void refresh(qc), onError: () => toast('Không tạo được mã ghép', 'error') }) }
export const useEmailSet = () => { const qc = useQueryClient(); return useMutation({ mutationFn: postEmail, onSuccess: (s) => qc.setQueryData(KEY, s), onError: () => toast('Địa chỉ email không hợp lệ', 'error') }) }
export const useEmailVerify = () => { const qc = useQueryClient(); return useMutation({ mutationFn: postEmailVerify, onSuccess: (s) => { qc.setQueryData(KEY, s); toast('Đã xác minh email') } }) }

export const useDeliveries = () =>
  useInfiniteQuery({ queryKey: ['deliveries'], queryFn: ({ pageParam }) => listDeliveries(pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (p) => p.nextCursor ?? undefined })
export const useResend = () => { const qc = useQueryClient(); return useMutation({ mutationFn: postResend, onSuccess: () => { toast('Đã gửi lại'); void refresh(qc) }, onError: () => toast('Gửi lại thất bại', 'error') }) }
