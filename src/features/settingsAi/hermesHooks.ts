import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getHermesStatus, listHermesAgents, restartHermesBot, syncAllHermes, syncHermesAgent } from '../../api/hermes'

const STATUS = ['hermes', 'status'] as const
const AGENTS = ['hermes', 'agents'] as const

/** Làm mới mỗi 30 giây khi tab trình duyệt đang hiện. */
export const useHermesStatus = (enabled: boolean) => useQuery({ queryKey: STATUS, queryFn: getHermesStatus, enabled, retry: false, refetchInterval: 30_000, refetchIntervalInBackground: false })
export const useHermesAgents = (enabled: boolean) => useQuery({ queryKey: AGENTS, queryFn: listHermesAgents, enabled, retry: false })

/** Ba thao tác; xong thì tải lại trạng thái và danh sách. gcTime 0: không giữ biến mutation lại trong cache. */
export function useHermesActions() {
  const qc = useQueryClient()
  const done = () => Promise.all([qc.invalidateQueries({ queryKey: STATUS }), qc.invalidateQueries({ queryKey: AGENTS })])
  const opts = { gcTime: 0, onSuccess: done }
  const all = useMutation({ ...opts, mutationFn: syncAllHermes })
  const one = useMutation({ ...opts, mutationFn: syncHermesAgent })
  const restart = useMutation({ ...opts, mutationFn: restartHermesBot })
  return { all, one, restart, busy: all.isPending || one.isPending || restart.isPending }
}
