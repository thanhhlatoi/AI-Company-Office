import { z } from 'zod'
import { ConversationContextSchema, ForgetPreviewSchema, MemoryExportSchema, MemoryItemSchema, MemoryNamespaceSchema, type MemoryEdit, type NamespaceConfig } from '../types/memory'
import { request } from './http'
import { qs } from './query'

// Bộ nhớ: ghi, xem xét, quên, xuất (Bước 6). Hợp đồng: docs/BE_API_SPEC_PART3.md mục 11.
export const putMemory = (id: string, e: MemoryEdit) => request('PUT', `/memory/${id}`, MemoryItemSchema, e)
export const deleteMemory = (id: string) => request('DELETE', `/memory/${id}`, z.unknown())
export const postReview = (id: string, b: { decision: 'APPROVE' | 'REJECT'; content?: string }) => request('POST', `/memory/${id}/review`, MemoryItemSchema, b)
export const postBulkReview = (ids: string[], decision: 'APPROVE' | 'REJECT') => request('POST', '/memory/review/bulk', z.object({ updated: z.number() }), { ids, decision })
export const postForgetPreview = (b: { subject: string; agentId?: string }) => request('POST', '/memory/forget/preview', ForgetPreviewSchema, b)
export const postForget = (b: { subject: string; agentId?: string }) => request('POST', '/memory/forget', z.object({ deleted: z.number() }), b)
export const getMemoryExport = (agentId?: string) => request('GET', `/memory/export${qs({ agentId })}`, MemoryExportSchema)
export const putNamespace = (id: string, c: NamespaceConfig) => request('PUT', `/memory/namespaces/${id}`, MemoryNamespaceSchema, c)
export const getConversationContext = (id: string) => request('GET', `/conversations/${id}/context`, ConversationContextSchema)
