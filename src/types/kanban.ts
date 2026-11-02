import { z } from 'zod'
import { pageOf } from './common'
import { TaskSchema } from './index'

// ---- Bảng Kanban (GIẢ ĐỊNH, mục I). FE chỉ GỢI Ý; BE quyết định việc di chuyển. ----
export const KanbanColumnIdSchema = z.enum(['QUEUED', 'RUNNING', 'AWAITING_APPROVAL', 'DONE', 'FAILED_CANCELLED'])
export type KanbanColumnId = z.infer<typeof KanbanColumnIdSchema>

/** Một trang của một cột: GET /kanban/columns/{id}?...&cursor=...&limit=50 */
export const KanbanPageSchema = pageOf(TaskSchema).extend({ total: z.number() })
export type KanbanPage = z.infer<typeof KanbanPageSchema>

/** Lý do BE từ chối di chuyển (HTTP 409) */
export const MoveReasonSchema = z.enum(['DEPENDENCIES_PENDING', 'NOT_SUPPORTED', 'USE_APPROVAL_DIALOG', 'NOT_ALLOWED', 'STALE_VERSION'])
export type MoveReason = z.infer<typeof MoveReasonSchema>
export const MoveErrorSchema = z.object({ reasonCode: MoveReasonSchema, message: z.string().nullish() })

export const TaskHistorySchema = z.object({ at: z.string(), status: z.string(), note: z.string().default('') })
export type TaskHistoryItem = z.infer<typeof TaskHistorySchema>

export interface MoveRequest { toColumn: KanbanColumnId; beforeTaskId?: string | null; expectedVersion: number }
