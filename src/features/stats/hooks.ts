import { useQuery } from '@tanstack/react-query'
import { getStatsOverview, type Range } from '../../api/biz'

/** Số liệu dashboard; tự làm mới mỗi 30 giây, và ngay khi nhận stats.invalidated (xem realtime/invalidate.ts). */
export const useStatsOverview = (r: Range, f: { departmentId?: string; projectId?: string } = {}) =>
  useQuery({ queryKey: ['stats', r, f], queryFn: () => getStatsOverview(r, f), refetchInterval: 30_000 })
