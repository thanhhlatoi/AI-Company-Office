import { z } from 'zod'
import { Id, Micro } from './common'

// ---- Dự án (GIẢ ĐỊNH, xem docs/MISSING_API.md mục I) ----
const Count = z.number().default(0)
export const ProjectSchema = z.object({
  id: Id,
  name: z.string(),
  description: z.string().default(''),
  departmentId: Id.nullish(),
  color: z.string().default('#2563eb'),
  dueDate: z.string().nullish(), // ISO
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
  budgetMicro: Micro.nullish(),
  costMicro: Micro.default(0),
  /** Task xong / task chưa huỷ, theo trọng số (BE tính). Task lỗi vẫn nằm trong mẫu số. */
  progressPct: z.number().default(0),
  counts: z.object({ queued: Count, running: Count, awaitingApproval: Count, waitingBudget: Count, done: Count, failed: Count, cancelled: Count }).prefault({}),
  goalIds: z.array(Id).default([]),
  createdAt: z.string(),
})
export type Project = z.infer<typeof ProjectSchema>

/** Ảnh chụp tiến độ mỗi ngày (cho đường tiến độ). */
export const ProjectSnapshotSchema = z.object({ day: z.string(), progressPct: z.number() })
export type ProjectSnapshot = z.infer<typeof ProjectSnapshotSchema>

/** Dòng nhật ký của dự án. */
export const ActivitySchema = z.object({ id: Id, at: z.string(), message: z.string(), kind: z.string().default('info') })
export type Activity = z.infer<typeof ActivitySchema>

export const ProjectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  departmentId: z.string().nullish(),
  color: z.string(),
  dueDate: z.string().nullish(),
  budgetMicro: Micro.nullish(),
})
export type ProjectInput = z.infer<typeof ProjectInputSchema>
