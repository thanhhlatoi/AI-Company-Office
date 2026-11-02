import { z } from 'zod'
import { AgentSchema } from '../types'
import { AgentTemplateSchema, type AgentTemplateInput, type InstantiateInput } from '../types/studio'
import { request } from './http'

// Mẫu agent: lưu / nhập / nhân bản / xoá / tạo agent (Bước 7). Hợp đồng: docs/BE_API_SPEC_PART3.md mục 12.
export const postTemplate = (b: AgentTemplateInput) => request('POST', '/templates', AgentTemplateSchema, b)
export const postImportTemplate = (b: AgentTemplateInput) => request('POST', '/templates/import', AgentTemplateSchema, b)
export const postCloneTemplate = (id: string) => request('POST', `/templates/${id}/clone`, AgentTemplateSchema)
export const deleteTemplate = (id: string) => request('DELETE', `/templates/${id}`, z.unknown())
/** Tạo agent từ mẫu trong MỘT giao dịch; 400 {message} nếu phạm vi sai, 403 {reasonCode} nếu công cụ bị khoá */
export const postInstantiate = (id: string, b: InstantiateInput) => request('POST', `/templates/${id}/instantiate`, z.object({ agent: AgentSchema }), b)
/** "Lưu agent này thành mẫu": BE tự gỡ bí mật, id tài khoản, đường dẫn, bộ nhớ và tài liệu khỏi phạm vi công cụ */
export const postSaveAsTemplate = (agentId: string, b: AgentTemplateInput) => request('POST', `/agents/${agentId}/save-as-template`, AgentTemplateSchema, b)
