import { z } from 'zod'
import { Id, pageOf } from './common'

// ---- Thông báo (GIẢ ĐỊNH, mục I) ----
export const NotifyLevelSchema = z.enum(['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'])
export type NotifyLevel = z.infer<typeof NotifyLevelSchema>

export const NotificationSchema = z.object({
  id: Id,
  level: NotifyLevelSchema,
  /** Loại sự kiện, vd goal.done, task.failed, approval.requested, budget.soft, device.offline */
  type: z.string(),
  title: z.string(),
  body: z.string().default(''),
  /** Đối tượng để bấm đi tới */
  target: z.object({ kind: z.enum(['TASK', 'GOAL', 'APPROVAL', 'DEVICE', 'BUDGET', 'PROJECT', 'AGENT']), id: Id }).nullish(),
  createdAt: z.string(),
  readAt: z.string().nullish(),
})
export type Notification = z.infer<typeof NotificationSchema>
export const NotificationPageSchema = pageOf(NotificationSchema)
export const UnreadSchema = z.object({ count: z.number() })

// ---- Kênh + quy tắc + giao hàng (GIẢ ĐỊNH, mục I). FE KHÔNG BAO GIỜ nhận token bot hay mật khẩu SMTP. ----
export const ChannelStatusSchema = z.enum(['NONE', 'PENDING', 'VERIFIED'])
export type ChannelStatus = z.infer<typeof ChannelStatusSchema>

export const RuleSchema = z.object({
  type: z.string(),
  channels: z.object({ app: z.boolean(), telegram: z.boolean(), email: z.boolean() }),
  minLevel: NotifyLevelSchema,
  projectId: Id.nullish(),
  agentId: Id.nullish(),
})
export type Rule = z.infer<typeof RuleSchema>

export const NotificationSettingsSchema = z.object({
  telegram: z.object({ status: ChannelStatusSchema, username: z.string().nullish(), botName: z.string().nullish() }),
  email: z.object({ status: ChannelStatusSchema, address: z.string().nullish() }),
  rules: z.array(RuleSchema),
  quiet: z.object({ enabled: z.boolean(), from: z.string(), to: z.string(), tz: z.string().default('Asia/Ho_Chi_Minh') }), // HH:mm
  digest: z.object({ enabled: z.boolean(), at: z.string() }), // tóm tắt cuối ngày, HH:mm
})
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>

/** Mã ghép Telegram dùng một lần: người dùng mở bot và gửi `/start <code>` */
export const LinkCodeSchema = z.object({ code: z.string(), botName: z.string(), expiresAt: z.string() })

export const DeliverySchema = z.object({
  id: Id,
  channel: z.enum(['TELEGRAM', 'EMAIL']),
  title: z.string(),
  status: z.enum(['SENT', 'FAILED', 'DEAD']), // DEAD = hết số lần thử, không tự gửi lại nữa
  error: z.string().nullish(),
  attempts: z.number().default(1),
  createdAt: z.string(),
})
export type Delivery = z.infer<typeof DeliverySchema>
export const DeliveryPageSchema = pageOf(DeliverySchema)
