import { z } from 'zod'
import { Id, Micro } from './common'

// ---- Chi phí và ngân sách (GIẢ ĐỊNH, mục I) ----
export const UsageGroupBySchema = z.enum(['agent', 'department', 'project', 'model'])
export type UsageGroupBy = z.infer<typeof UsageGroupBySchema>

export const UsageRowSchema = z.object({ key: z.string(), label: z.string(), totalMicro: Micro, calls: z.number(), inputTokens: z.number(), outputTokens: z.number() })
export type UsageRow = z.infer<typeof UsageRowSchema>

/** `parts`: chi phí ngày đó theo từng khoá nhóm (để xếp chồng); tổng parts = totalMicro. */
export const UsageDaySchema = z.object({ day: z.string(), totalMicro: Micro, parts: z.record(z.string(), Micro).default({}) })

export const UsageSummarySchema = z.object({
  from: z.string(), to: z.string(),
  groupBy: UsageGroupBySchema,
  totalMicro: Micro,
  prevTotalMicro: Micro.nullish(),
  calls: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  avgPerTaskMicro: Micro.nullish(),
  /** Số cuộc gọi chưa có giá: chi phí thực tế cao hơn con số đang hiện */
  unpricedCalls: z.number().default(0),
  byDay: z.array(UsageDaySchema),
  rows: z.array(UsageRowSchema),
})
export type UsageSummary = z.infer<typeof UsageSummarySchema>

export const ModelPriceSchema = z.object({ id: Id, model: z.string(), inputPerMTokMicro: Micro, outputPerMTokMicro: Micro, effectiveFrom: z.string() })
export type ModelPrice = z.infer<typeof ModelPriceSchema>

export const BudgetSchema = z.object({
  id: Id,
  scopeType: z.enum(['AGENT', 'DEPARTMENT', 'PROJECT', 'COMPANY']),
  scopeId: Id.nullish(),
  scopeLabel: z.string(),
  period: z.enum(['DAY', 'MONTH', 'TOTAL']),
  limitMicro: Micro,
  usedMicro: Micro.default(0),
  /** Tiền đang đặt chỗ cho task đang chạy / chờ */
  reservedMicro: Micro.default(0),
  /** Số task đang WAITING_BUDGET vì ngân sách này (BE đếm trong phạm vi) */
  waitingTasks: z.number().default(0),
  warnPct: z.number().default(80),
  /** BLOCK: vượt thì chặn (task WAITING_BUDGET); WARN: chỉ cảnh báo */
  mode: z.enum(['BLOCK', 'WARN']).default('BLOCK'),
  /** BE tính: OK < ngưỡng mềm <= SOFT < hạn mức <= HARD */
  state: z.enum(['OK', 'SOFT', 'HARD']).default('OK'),
})
export type Budget = z.infer<typeof BudgetSchema>

export const BudgetChangeSchema = z.object({ id: Id, budgetId: Id, at: z.string(), fromMicro: Micro, toMicro: Micro, reason: z.string() })
export type BudgetChange = z.infer<typeof BudgetChangeSchema>

// Ghi ngân sách / giá (GIẢ ĐỊNH, mục I)
export const BudgetInputSchema = z.object({
  scopeType: z.enum(['AGENT', 'DEPARTMENT', 'PROJECT', 'COMPANY']),
  scopeId: Id.nullish(),
  period: z.enum(['DAY', 'MONTH', 'TOTAL']),
  limitMicro: Micro,
  warnPct: z.number().default(80),
  mode: z.enum(['BLOCK', 'WARN']).default('BLOCK'),
})
export type BudgetInput = z.infer<typeof BudgetInputSchema>
/** Sửa ngân sách: tăng hạn mức thì BẮT BUỘC có `reason` (BE ghi vào lịch sử thay đổi). */
export interface BudgetUpdate { limitMicro: number; warnPct: number; mode: 'BLOCK' | 'WARN'; reason?: string }
export const ModelPriceInputSchema = z.object({ model: z.string().min(1), inputPerMTokMicro: Micro, outputPerMTokMicro: Micro, effectiveFrom: z.string() })
export type ModelPriceInput = z.infer<typeof ModelPriceInputSchema>
