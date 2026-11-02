import { ApproveResultSchema } from '../types'
import { request } from './http'

// Danh sách yêu cầu nằm trong api/work.ts (ảnh chụp ban đầu). Ở đây chỉ có hành động quyết định.
export const approve = (id: string) => request('POST', `/approvals/${id}/approve`, ApproveResultSchema)
export const reject = (id: string, reason: string) => request('POST', `/approvals/${id}/reject`, ApproveResultSchema, { reason })
