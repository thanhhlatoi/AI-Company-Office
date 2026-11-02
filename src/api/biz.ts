import { z } from 'zod'
import { BudgetChangeSchema, BudgetSchema, ModelPriceSchema, UsageSummarySchema, type BudgetInput, type BudgetUpdate, type ModelPriceInput, type UsageGroupBy } from '../types/cost'
import { ConversationPageSchema, ConversationSchema, MessagePageSchema } from '../types/history'
import { KanbanPageSchema, TaskHistorySchema, type KanbanColumnId, type MoveRequest } from '../types/kanban'
import { DeliveryPageSchema, DeliverySchema, LinkCodeSchema, NotificationPageSchema, NotificationSchema, NotificationSettingsSchema, UnreadSchema, type NotificationSettings } from '../types/notify'
import { ActivitySchema, ProjectSchema, ProjectSnapshotSchema, type ProjectInput } from '../types/project'
import { StatsOverviewSchema } from '../types/stats'
import { GoalSchema, TaskSchema } from '../types'
import { request } from './http'
import { qs } from './query'

// Các lệnh ĐỌC của Prompt 3C (ghi làm ở từng bước tương ứng). Hợp đồng: docs/MISSING_API.md mục I.
export interface Range { from: string; to: string }
export interface KanbanFilters { projectId?: string; agentId?: string; departmentId?: string; priority?: string; q?: string }
export interface HistoryFilters { q?: string; taskId?: string; agentId?: string; departmentId?: string; projectId?: string; goalId?: string; from?: string; to?: string; role?: string; hasError?: boolean; tool?: string; sort?: 'relevance' | 'newest' }

export const listProjects = (f: { status?: string; departmentId?: string; q?: string }) => request('GET', `/projects${qs(f)}`, z.array(ProjectSchema))
export const getProject = (id: string) => request('GET', `/projects/${id}`, ProjectSchema)
export const listProjectSnapshots = (id: string) => request('GET', `/projects/${id}/snapshots`, z.array(ProjectSnapshotSchema))
export const listProjectActivity = (id: string) => request('GET', `/projects/${id}/events`, z.array(ActivitySchema))

export const postProject = (input: ProjectInput) => request('POST', '/projects', ProjectSchema, input)
export const postProjectStatus = (id: string, action: 'archive' | 'reopen') => request('POST', `/projects/${id}/${action}`, ProjectSchema)
/** Gán / chuyển mục tiêu sang dự án (projectId null = bỏ khỏi dự án) */
export const postGoalProject = (goalId: string, projectId: string | null) => request('POST', `/goals/${goalId}/project`, GoalSchema, { projectId })

export const KANBAN_PAGE = 50
export const getKanbanPage = (column: KanbanColumnId, f: KanbanFilters, cursor?: string) =>
  request('GET', `/kanban/columns/${column}${qs({ ...f, cursor, limit: KANBAN_PAGE })}`, KanbanPageSchema)

export const getTask = (id: string) => request('GET', `/tasks/${id}`, TaskSchema)
export const getTaskHistory = (id: string) => request('GET', `/tasks/${id}/history`, z.array(TaskHistorySchema))
/** BE QUYẾT ĐỊNH: từ chối = HTTP 409 {reasonCode} (ApiError.body) */
export const postMove = (id: string, req: MoveRequest) => request('POST', `/tasks/${id}/move`, TaskSchema, req)
export const postAssign = (id: string, agentId: string) => request('POST', `/tasks/${id}/assign`, TaskSchema, { agentId })

export const getUsage = (r: Range, groupBy: UsageGroupBy, f: { projectId?: string; agentId?: string } = {}) => request('GET', `/usage${qs({ ...r, groupBy, ...f })}`, UsageSummarySchema)
export const listModelPrices = () => request('GET', '/model-prices', z.array(ModelPriceSchema))
export const listBudgets = () => request('GET', '/budgets', z.array(BudgetSchema))
export const postBudget = (b: BudgetInput) => request('POST', '/budgets', BudgetSchema, b)
/** Tăng hạn mức thì `reason` bắt buộc (BE ghi lịch sử và từ chối 400 nếu thiếu) */
export const putBudget = (id: string, u: BudgetUpdate) => request('PUT', `/budgets/${id}`, BudgetSchema, u)
export const postModelPrice = (p: ModelPriceInput) => request('POST', '/model-prices', ModelPriceSchema, p)
export const listBudgetChanges = (id: string) => request('GET', `/budgets/${id}/changes`, z.array(BudgetChangeSchema))

export const listConversations = (f: HistoryFilters, cursor?: string) => request('GET', `/conversations${qs({ ...f, cursor, limit: 30 })}`, ConversationPageSchema)
export const getConversation = (id: string) => request('GET', `/conversations/${id}`, ConversationSchema)
export const deleteConversation = (id: string) => request('DELETE', `/conversations/${id}`, z.unknown())
export const listMessages = (id: string, cursor?: string) => request('GET', `/conversations/${id}/messages${qs({ cursor, limit: 40 })}`, MessagePageSchema)

export const getStatsOverview = (r: Range, f: { departmentId?: string; projectId?: string } = {}) => request('GET', `/stats/overview${qs({ ...r, ...f })}`, StatsOverviewSchema)

export const listNotifications = (f: { level?: string; type?: string; unread?: boolean }, cursor?: string) => request('GET', `/notifications${qs({ ...f, cursor, limit: 30 })}`, NotificationPageSchema)
export const getUnread = () => request('GET', '/notifications/unread-count', UnreadSchema)

// ---- Thông báo: ghi + kênh + cài đặt ----
export const postMarkRead = (id: string) => request('POST', `/notifications/${id}/read`, NotificationSchema)
export const postReadAll = () => request('POST', '/notifications/read-all', UnreadSchema)
export const getNotifySettings = () => request('GET', '/notification-settings', NotificationSettingsSchema)
export const putNotifySettings = (s: Pick<NotificationSettings, 'rules' | 'quiet' | 'digest'>) => request('PUT', '/notification-settings', NotificationSettingsSchema, s)
export const postTelegramLink = () => request('POST', '/notification-channels/telegram/link', LinkCodeSchema)
export const postChannelTest = (channel: 'telegram' | 'email') => request('POST', `/notification-channels/${channel}/test`, DeliverySchema)
export const deleteChannel = (channel: 'telegram' | 'email') => request('DELETE', `/notification-channels/${channel}`, z.unknown())
export const postEmail = (address: string) => request('POST', '/notification-channels/email', NotificationSettingsSchema, { address })
export const postEmailVerify = (code: string) => request('POST', '/notification-channels/email/verify', NotificationSettingsSchema, { code })
export const listDeliveries = (cursor?: string) => request('GET', `/notification-deliveries${qs({ cursor, limit: 20 })}`, DeliveryPageSchema)
export const postResend = (id: string) => request('POST', `/notification-deliveries/${id}/resend`, DeliverySchema)
