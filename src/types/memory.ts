import { z } from 'zod'
import { Id, pageOf } from './common'

// ---- Bộ nhớ của agent (GIẢ ĐỊNH). Nội dung KHÔNG TIN CẬY: luôn render đã làm sạch. ----
export const MemoryOriginSchema = z.enum(['OWNER', 'AGENT_OBSERVED', 'EXTERNAL_INFERRED'])
export type MemoryOrigin = z.infer<typeof MemoryOriginSchema>

export const MemoryItemSchema = z.object({
  id: Id, namespaceId: Id, agentId: Id.nullish(),
  kind: z.enum(['FACT', 'PREFERENCE', 'EVENT', 'PROCEDURE']),
  content: z.string(),
  subject: z.string().nullish(), // chủ thể, vd "Khách hàng X"
  importance: z.number().min(1).max(5).default(3),
  origin: MemoryOriginSchema,
  confidence: z.number().min(0).max(1).default(0.8),
  status: z.enum(['ACTIVE', 'PENDING_REVIEW', 'REJECTED', 'EXPIRED']).default('ACTIVE'),
  pinned: z.boolean().default(false),
  editedByOwner: z.boolean().default(false),
  createdAt: z.string(), lastAccessedAt: z.string().nullish(), expiresAt: z.string().nullish(),
  /** Nguồn: task đã sinh ra mục này và nội dung bên ngoài đã đọc */
  source: z.object({ taskId: Id.nullish(), externalRefs: z.array(z.string()).default([]) }).nullish(),
})
export type MemoryItem = z.infer<typeof MemoryItemSchema>
export const MemoryPageSchema = pageOf(MemoryItemSchema).extend({ total: z.number().default(0) })

export const MemoryNamespaceSchema = z.object({
  id: Id, name: z.string(), agentId: Id.nullish(),
  limit: z.number().default(500), ttlDays: z.number().nullish(), requireReview: z.boolean().default(false),
  itemCount: z.number().default(0), pendingCount: z.number().default(0),
})
export type MemoryNamespace = z.infer<typeof MemoryNamespaceSchema>

export const ForgetPreviewSchema = z.object({ count: z.number(), samples: z.array(z.string()) })
export const MemoryExportSchema = z.object({ agentId: Id.nullish(), exportedAt: z.string(), items: z.array(MemoryItemSchema) })
/** Những gì một hội thoại/task đã dùng: ký ức nạp vào và đoạn tài liệu được trích dẫn */
export const ConversationContextSchema = z.object({
  memories: z.array(z.object({ id: Id, content: z.string(), origin: MemoryOriginSchema, subject: z.string().nullish() })),
  citations: z.array(z.object({ chunkId: Id, collectionId: Id, documentId: Id, documentName: z.string(), page: z.number().nullish(), snippet: z.string(), trust: z.enum(['OWNER', 'EXTERNAL']) })),
})
export type ConversationContext = z.infer<typeof ConversationContextSchema>
export interface MemoryEdit { content?: string; pinned?: boolean; importance?: number }
export interface NamespaceConfig { limit: number; ttlDays: number | null; requireReview: boolean }
