import { z } from 'zod'
import { ApprovalSchema, EventsPageSchema, GoalSchema, SystemStateSchema, TaskSchema, type Priority } from '../types'
import { request } from './http'

// Ảnh chụp dữ liệu giao việc lúc mở trang (xem realtime/eventSync.ts). Ghi (duyệt, huỷ...) làm ở các bước sau.
export const getSystem = () => request('GET', '/system', SystemStateSchema)
export const listGoals = () => request('GET', '/goals', z.array(GoalSchema))
export const listAllTasks = () => request('GET', '/tasks', z.array(TaskSchema))
export const listAllApprovals = () => request('GET', '/approvals?status=ALL', z.array(ApprovalSchema))
export const EVENTS_PAGE = 500
export const fetchEvents = (afterId: number) => request('GET', `/events?afterId=${afterId}&limit=${EVENTS_PAGE}`, EventsPageSchema)

// Ghi: mục tiêu
export interface GoalInput { title: string; description: string; departmentId?: string; tokenBudget?: number; requirePlanApproval: boolean }
export const postGoal = (body: GoalInput) => request('POST', '/goals', GoalSchema, body)
export const postApprovePlan = (id: string) => request('POST', `/goals/${id}/approve-plan`, GoalSchema)
export const postRejectPlan = (id: string, reason: string) => request('POST', `/goals/${id}/reject-plan`, GoalSchema, { reason })
export const postCancelGoal = (id: string) => request('POST', `/goals/${id}/cancel`, GoalSchema)

// Ghi: task và hệ thống
export const postCancelTask = (id: string) => request('POST', `/tasks/${id}/cancel`, TaskSchema)
export const postRetryTask = (id: string) => request('POST', `/tasks/${id}/retry`, TaskSchema)
export const putTaskPriority = (id: string, priority: Priority) => request('PUT', `/tasks/${id}/priority`, TaskSchema, { priority })
export const postPause = (reason?: string) => request('POST', '/system/pause', SystemStateSchema, reason ? { reason } : {})
export const postResume = () => request('POST', '/system/resume', SystemStateSchema)
