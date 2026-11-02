import { z } from 'zod'
import { Id, Micro } from './common'

// ---- Dashboard (GIẢ ĐỊNH, mục I) ----
/** Một chỉ số + giá trị kỳ trước (null = chưa có để so sánh) */
const Kpi = z.object({ value: z.number(), prev: z.number().nullish() })

export const StatsOverviewSchema = z.object({
  updatedAt: z.string(),
  from: z.string(), to: z.string(),
  /** false = chưa đủ dữ liệu: FE hiện thông báo thay vì biểu đồ */
  enoughData: z.boolean().default(true),
  completed: Kpi,
  medianSec: Kpi, // thời gian xử lý trung vị
  p90Sec: z.number().nullish(),
  errorRate: Kpi, // 0..1, task lỗi hẳn / task kết thúc
  recoveredRate: z.number().nullish(), // 0..1, thành công sau thử lại
  cost: z.object({ value: Micro, prev: Micro.nullish() }),
  running: z.number().default(0), queued: z.number().default(0), awaiting: z.number().default(0),
  byDay: z.array(z.object({ day: z.string(), completed: z.number(), failed: z.number(), costMicro: Micro })),
  durationBuckets: z.array(z.object({ label: z.string(), count: z.number() })).default([]),
  costByDepartment: z.array(z.object({ key: z.string(), label: z.string(), totalMicro: Micro })).default([]),
  busiestAgents: z.array(z.object({ agentId: Id, tasks: z.number(), utilization: z.number(), queueDepth: z.number(), errorRate: z.number(), costMicro: Micro })).default([]),
  errorGroups: z.array(z.object({ key: z.string(), message: z.string(), count: z.number(), agentIds: z.array(Id).default([]), lastTaskId: Id.nullish(), lastAt: z.string() })).default([]),
  /** 7 hàng (thứ 2..CN) x 24 cột (giờ): số task; null/thiếu thì ẩn */
  heatmap: z.array(z.array(z.number())).nullish(),
})
export type StatsOverview = z.infer<typeof StatsOverviewSchema>
