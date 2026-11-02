import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteConversation } from '../../api/biz'
import { useUiStore } from '../../store/uiStore'

/** Xoá hội thoại: KHÔNG optimistic (xoá là thao tác không hoàn tác), danh sách tải lại sau khi BE xác nhận. */
export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => { useUiStore.getState().toast('Đã xoá hội thoại'); void qc.invalidateQueries({ queryKey: ['conversations'] }) },
    onError: () => useUiStore.getState().toast('Không xoá được, thử lại', 'error'),
  })
}
