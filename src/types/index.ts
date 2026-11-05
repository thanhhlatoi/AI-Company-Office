import { z } from 'zod'
import { Micro, Id, EventId } from './common'
import { BudgetSchema } from './cost'
import { NotificationSchema } from './notify'
import { ProjectSchema } from './project'
import { StudioEventSchemas } from './studioEvents'

// ⚠️ Schema dưới đây là GIẢ ĐỊNH (chưa có JSON thật từ BE). Khi có JSON mẫu,
// chỉ sửa file này — toàn app suy kiểu từ đây.

export const AgentStatusSchema = z.enum(['IDLE', 'WORKING', 'BLOCKED', 'ERROR', 'OFFLINE'])
export const AgentStatusValues = AgentStatusSchema.options
export type AgentStatus = z.infer<typeof AgentStatusSchema>


export const TaskStatusSchema = z.enum(['QUEUED', 'RUNNING', 'AWAITING_APPROVAL', 'WAITING_BUDGET', 'DONE', 'FAILED', 'CANCELLED'])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

export const TaskSchema = z.object({
  id: Id,
  agentId: Id,
  title: z.string(),
  input: z.string().default(''),
  status: TaskStatusSchema,
  result: z.string().nullable().default(null), // markdown
  createdAt: z.string(),
  updatedAt: z.string(),
  // Giao việc & hàng đợi (GIẢ ĐỊNH, xem docs/MISSING_API.md mục H). Thiếu thì dùng giá trị mặc định.
  goalId: Id.nullish(),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  dependsOn: z.array(Id).default([]), // id các task phải DONE trước
  attempts: z.number().default(0),
  error: z.string().nullish(),
  assignedById: Id.nullish(), // người giao (agent), null = chủ công ty / hệ thống
  startedAt: z.string().nullish(),
  tokensUsed: z.number().default(0),
  // Kanban / dự án / chi phí (GIẢ ĐỊNH, mục I)
  version: z.number().int().default(1), // tăng mỗi lần đổi: dùng làm expectedVersion khi kéo thả
  locked: z.boolean().default(false), // khoá (vd đang chờ duyệt): không kéo được
  parentId: Id.nullish(),
  projectId: Id.nullish(),
  costMicro: Micro.default(0),
  progressPct: z.number().nullish(), // chỉ task cha
})
export type Task = z.infer<typeof TaskSchema>
export const PrioritySchema = TaskSchema.shape.priority
export type Priority = z.infer<typeof PrioritySchema>

export const AgentSchema = z.object({
  id: Id,
  name: z.string(),
  role: z.string(),
  model: z.string(),
  systemPrompt: z.string().default(''),
  color: z.string().default('#2563eb'), // màu áo
  status: AgentStatusSchema,
  currentTask: z.object({ id: Id, title: z.string() }).nullable().default(null),
  // Phòng ban: BE chưa có -> mock (xem docs/MISSING_API.md). FE tự xếp bàn, không dùng toạ độ từ BE.
  departmentId: Id.nullable().default(null),
  isHead: z.boolean().default(false),
  // Máy mà agent đang chạy trên đó (xem Device). Máy OFFLINE -> agent hiện "Mất máy chủ".
  runsOnDeviceId: Id.nullable().default(null),
  // Kỹ năng: nhãn tự do (GIẢ ĐỊNH, xem docs/MISSING_API.md mục L). Hermes/BE dùng để chọn agent giao việc.
  skills: z.array(z.string()).default([]),
  // Diện mạo (màu da/tóc/áo). BE chưa có -> FE suy ra từ id (xem features/sprites/avatar.ts và docs/MISSING_API.md)
  avatar: z.object({ skin: z.string(), hair: z.string(), outfit: z.string() }).partial().nullish(),
})
export type Agent = z.infer<typeof AgentSchema>

export const AgentInputSchema = z.object({
  name: z.string().min(1, 'Tên là bắt buộc'),
  role: z.string().min(1, 'Vai trò là bắt buộc'),
  systemPrompt: z.string().min(10, 'System prompt tối thiểu 10 ký tự'),
  model: z.string().min(1),
  color: z.string(),
  departmentId: z.string().nullish(),
  skills: z.array(z.string().max(30)).max(12).default([]),
})
export type AgentInput = z.infer<typeof AgentInputSchema>

export const DepartmentSchema = z.object({
  id: Id,
  name: z.string(),
  slug: z.string(),
  icon: z.string().default('building'), // tên icon lucide, xem components/DepartmentIcon.tsx
  color: z.string(), // màu accent (hex)
  headAgentId: Id.nullable().default(null),
  order: z.number().default(0),
})
export type Department = z.infer<typeof DepartmentSchema>

/** Số liệu phòng. `doneToday` là thứ FE không tự tính được; token cost tuỳ chọn (không có thì ẩn thẻ). */
export const DepartmentStatsSchema = z.object({
  doneToday: z.number(),
  tokenCostToday: z.number().nullish(),
})
export type DepartmentKpi = z.infer<typeof DepartmentStatsSchema>

/** Kết quả giao mục tiêu cho phòng: kế hoạch chia việc do trưởng phòng đưa ra. */
export const GoalResultSchema = z.object({
  id: Id,
  departmentId: Id,
  goal: z.string(),
  createdAt: z.string(),
  plan: z.array(z.object({ agentId: Id, taskTitle: z.string(), taskId: Id.nullish() })),
})
export type GoalResult = z.infer<typeof GoalResultSchema>

export const AgentEventSchema = z.object({
  id: Id,
  agentId: Id,
  message: z.string(),
  createdAt: z.string(),
})
export type AgentEvent = z.infer<typeof AgentEventSchema>

// ---- Mục tiêu (Goal) ----
export const GoalStatusSchema = z.enum(['PLANNING', 'AWAITING_PLAN_APPROVAL', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED', 'REJECTED'])
export type GoalStatus = z.infer<typeof GoalStatusSchema>

/** Một việc trong kế hoạch đề xuất. `key` là id trong phạm vi kế hoạch; `dependsOn` trỏ tới `key` khác. */
export const PlanItemSchema = z.object({
  key: Id,
  title: z.string(),
  assigneeId: Id,
  priority: PrioritySchema,
  dependsOn: z.array(Id).default([]),
  estimateTokens: z.number().nullish(),
})
export type PlanItem = z.infer<typeof PlanItemSchema>

export const GoalSchema = z.object({
  id: Id,
  title: z.string(),
  description: z.string().default(''),
  departmentId: Id.nullish(),
  projectId: Id.nullish(), // dự án chứa mục tiêu này (GIẢ ĐỊNH, mục I)
  tokenBudget: z.number().nullish(),
  tokensUsed: z.number().default(0),
  requirePlanApproval: z.boolean().default(true),
  status: GoalStatusSchema,
  plan: z.array(PlanItemSchema).default([]),
  rejectReason: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  finishedAt: z.string().nullish(),
})
export type Goal = z.infer<typeof GoalSchema>

// ---- Phê duyệt hành động nhạy cảm ----
export const RiskTypeSchema = z.enum(['EXTERNAL', 'MONEY', 'DESTRUCTIVE'])
export type RiskType = z.infer<typeof RiskTypeSchema>
export const ApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'])
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>

export const ApprovalSchema = z.object({
  id: Id,
  agentId: Id,
  title: z.string().nullish(),
  createdAt: z.string().nullish(),
  riskType: RiskTypeSchema.default('EXTERNAL'),
  goalId: Id.nullish(),
  taskId: Id.nullish(),
  action: z.string().nullish(), // tên hành động, vd "send_email"
  argsSnapshot: z.record(z.string(), z.unknown()).default({}), // ĐÚNG tham số sẽ thực thi: FE hiển thị nguyên văn
  expiresAt: z.string().nullish(),
  status: ApprovalStatusSchema.default('PENDING'),
  decisionReason: z.string().nullish(),
  decidedAt: z.string().nullish(),
})
export type Approval = z.infer<typeof ApprovalSchema>
export const ApproveResultSchema = z.object({ id: Id, status: z.string() })

// ---- Điều khiển hệ thống ----
export const SystemStateSchema = z.object({
  state: z.enum(['RUNNING', 'PAUSED']),
  reason: z.string().nullish(),
  /** id sự kiện mới nhất tại thời điểm chụp: mốc để FE bù sự kiện về sau */
  lastEventId: z.number().int().default(0),
})
export type SystemState = z.infer<typeof SystemStateSchema>

/** Trang sự kiện bù: GET /events?afterId=N. `truncated` = BE đã xoá bớt, khoảng trống quá lớn -> FE tải lại toàn bộ. */
export const EventsPageSchema = z.object({
  events: z.array(z.unknown()),
  truncated: z.boolean().default(false),
  lastId: z.number().int().default(0),
})

// ---- Hạ tầng & thiết bị (máy thật được giám sát, KHÔNG phải agent) ----
// Zod mặc định bỏ field lạ -> mật khẩu/khoá/token BE lỡ gửi kèm cũng không vào được FE.
export const DeviceTypeSchema = z.enum(['WORKSTATION', 'AI_PC', 'LAPTOP', 'SERVER', 'ROUTER', 'NAS'])
export type DeviceType = z.infer<typeof DeviceTypeSchema>
export const DeviceStatusSchema = z.enum(['ONLINE', 'DEGRADED', 'OFFLINE'])
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>

const Num = z.number().nullish() // thiếu chỉ số nào thì ẩn mục đó, không báo lỗi
export const DeviceMetricsSchema = z.object({
  cpuPct: Num, ramPct: Num, diskPct: Num, tempC: Num, netInKbps: Num, netOutKbps: Num,
  gpu: z.object({ utilPct: Num, vramPct: Num, tempC: Num }).nullish(),
  nas: z.object({ volumeUsedPct: Num, raidStatus: z.string().nullish() }).nullish(),
  router: z.object({ wanUp: z.boolean().nullish(), latencyMs: Num }).nullish(),
})
export type DeviceMetrics = z.infer<typeof DeviceMetricsSchema>

export const DeviceSchema = z.object({
  id: Id,
  name: z.string(),
  type: DeviceTypeSchema,
  os: z.string().default(''),
  status: DeviceStatusSchema,
  lastSeen: z.string().nullish(),
  uptimeSec: Num,
  ownerAgentId: Id.nullish(),
  ip: z.string().nullish(), // ẩn mặc định trong panel
  metrics: DeviceMetricsSchema.default({}),
})
export type Device = z.infer<typeof DeviceSchema>

export const DeviceEventSchema = z.object({
  id: Id,
  deviceId: Id,
  type: z.string(),
  message: z.string(),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  createdAt: z.string(),
})
export type DeviceEvent = z.infer<typeof DeviceEventSchema>

/** Một đầu là 'internet' (nút ảo) hoặc id thiết bị. */
export const NetworkLinkSchema = z.object({
  fromDeviceId: Id,
  toDeviceId: Id,
  kbps: z.number().default(0),
  latencyMs: Num,
  up: z.boolean().default(true),
})
export type NetworkLink = z.infer<typeof NetworkLinkSchema>

export const AlertKindSchema = z.enum(['cpu', 'disk', 'temp', 'offline'])
export type AlertKind = z.infer<typeof AlertKindSchema>


// Các message realtime trên /topic/agents, phân biệt bằng `type`.
export const RealtimeMessageSchema = z.discriminatedUnion('type', [
  z.object({
    id: EventId,
    type: z.literal('agent.status_changed'),
    agentId: Id,
    status: AgentStatusSchema,
    currentTask: z.object({ id: Id, title: z.string() }).nullable().default(null),
  }),
  z.object({ id: EventId, type: z.literal('task.created'), task: TaskSchema }),
  z.object({ id: EventId, type: z.literal('task.updated'), task: TaskSchema }),
  z.object({ id: EventId, type: z.literal('event.created'), event: AgentEventSchema }),
  // Trưởng phòng chia việc: FE vẽ đường nối từ bàn trưởng phòng tới từng nhân viên
  z.object({ id: EventId, type: z.literal('department.dispatch'), departmentId: Id, headId: Id, targetAgentIds: z.array(Id) }),
  // Sự kiện kích hoạt nhân vật di chuyển (chỉ là hiệu ứng; trạng thái thật vẫn do BE gửi qua agent.status_changed...)
  z.object({ id: EventId, type: z.literal('task.handoff'), fromAgentId: Id, toAgentId: Id, taskId: Id, message: z.string().default('') }),
  z.object({ id: EventId, type: z.literal('report.to_head'), agentId: Id, departmentId: Id, taskId: Id.nullish() }),
  z.object({ id: EventId, type: z.literal('approval.requested'), agentId: Id, approvalId: Id, approval: ApprovalSchema.optional() }),
  z.object({ id: EventId, type: z.literal('approval.resolved'), approvalId: Id, approved: z.boolean().default(true), status: ApprovalStatusSchema.optional(), reason: z.string().nullish() }),
  z.object({ id: EventId, type: z.literal('meeting.started'), departmentId: Id, agentIds: z.array(Id), endsAt: z.string().nullish() }),
  z.object({ id: EventId, type: z.literal('meeting.ended'), departmentId: Id }),
  // Mục tiêu / hệ thống (GIẢ ĐỊNH, xem docs/MISSING_API.md mục H)
  z.object({ id: EventId, type: z.literal('goal.created'), goal: GoalSchema }),
  z.object({ id: EventId, type: z.literal('goal.updated'), goal: GoalSchema }),
  z.object({ id: EventId, type: z.literal('system.state_changed'), state: SystemStateSchema.shape.state, reason: z.string().nullish() }),
  // Hạ tầng: thiết bị thật (xem Device ở trên)
  z.object({ id: EventId, type: z.literal('device.status_changed'), deviceId: Id, status: DeviceStatusSchema, lastSeen: z.string().nullish() }),
  z.object({ id: EventId, type: z.literal('device.metrics'), deviceId: Id, metrics: DeviceMetricsSchema, uptimeSec: Num, lastSeen: z.string().nullish() }),
  z.object({ id: EventId, type: z.literal('device.alert'), deviceId: Id, kind: AlertKindSchema, message: z.string(), severity: z.enum(['warning', 'critical']).default('warning') }),
  NetworkLinkSchema.extend({ id: EventId, type: z.literal('network.link_changed') }),
  // Dự án / ngân sách / thống kê / thông báo (GIẢ ĐỊNH, mục I)
  z.object({ id: EventId, type: z.literal('project.updated'), project: ProjectSchema }),
  z.object({ id: EventId, type: z.literal('budget.updated'), budget: BudgetSchema }),
  z.object({ id: EventId, type: z.literal('stats.invalidated') }),
  z.object({ id: EventId, type: z.literal('notification.created'), notification: NotificationSchema }),
  // Agent Studio / công cụ / model / kho / bộ nhớ / mẫu (GIẢ ĐỊNH, Prompt 4D)
  ...StudioEventSchemas,
])
export type RealtimeMessage = z.infer<typeof RealtimeMessageSchema>
/** Các sự kiện làm nhân vật đi lại. */
export type MotionMessage = Extract<RealtimeMessage, { type: 'task.handoff' | 'report.to_head' | 'meeting.started' | 'meeting.ended' }>

export type ConnectionState = 'connected' | 'connecting' | 'disconnected'
