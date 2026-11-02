import { z } from 'zod'
import { Id, Micro, pageOf } from './common'

// ---- Lịch sử hội thoại (GIẢ ĐỊNH, mục I). Nội dung là dữ liệu KHÔNG tin cậy: luôn render đã làm sạch. ----
export const MessageSchema = z.object({
  id: Id,
  role: z.enum(['USER', 'ASSISTANT', 'TOOL']),
  /** Văn bản/markdown thô; BE đã thay bí mật bằng [REDACTED:LOẠI] */
  content: z.string().default(''),
  createdAt: z.string(),
  tokens: z.number().default(0),
  costMicro: Micro.default(0),
  toolName: z.string().nullish(),
  toolArgs: z.record(z.string(), z.unknown()).nullish(), // đã redact
  truncated: z.boolean().default(false),
})
export type Message = z.infer<typeof MessageSchema>

export const ConversationSchema = z.object({
  id: Id,
  title: z.string(),
  agentId: Id,
  goalId: Id.nullish(),
  taskId: Id.nullish(),
  projectId: Id.nullish(),
  startedAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().default(0),
  tokens: z.number().default(0),
  costMicro: Micro.default(0),
  hasError: z.boolean().default(false),
  tools: z.array(z.string()).default([]),
  /** Đoạn trích quanh từ khoá khớp (văn bản thường) */
  snippet: z.string().nullish(),
})
export type Conversation = z.infer<typeof ConversationSchema>
export const ConversationPageSchema = pageOf(ConversationSchema)
export const MessagePageSchema = pageOf(MessageSchema)
