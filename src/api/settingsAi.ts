import type { z } from 'zod'
import { request } from './http'
import { ModelListSchema, SettingsAiSchema, StatusSchema, TestResultSchema, type SettingsAiPatch, type TestBody } from '../types/settingsAi'

// Mock/thật do `request` + VITE_USE_MOCK quyết định (mock ở src/mocks/settingsAi.ts).
// Mọi lời gọi /settings/ai đi qua `req`: BE chưa có xác thực chủ, sau này gắn token/header ở MỘT chỗ này.
const req = <T>(method: 'GET' | 'PUT' | 'POST', path: string, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal) =>
  request(method, `/settings/ai${path}`, schema, body, signal)

export const getSettingsAi = () => req('GET', '', SettingsAiSchema)
export const putSettingsAi = (patch: SettingsAiPatch) => req('PUT', '', SettingsAiSchema, patch)
export const getAiStatus = () => req('GET', '/status', StatusSchema)
export const getAiModels = (source: 'ollama' | 'omniroute') => req('GET', `/models?source=${source}`, ModelListSchema)
export const testAi = (body: TestBody, signal?: AbortSignal) => req('POST', '/test', TestResultSchema, body, signal)
