import { z } from 'zod'
import { GatewayTestSchema, LlmModelSchema, LlmProviderSchema } from '../types/gateway'
import { request } from './http'

// 9Router qua BE: luôn gọi BE thật (live), không bao giờ dùng mock.
export const listLlmProviders = () => request('GET', '/llm/providers', z.array(LlmProviderSchema), undefined, undefined, true)
export const listLlmModels = (provider: string) => request('GET', `/llm/models?provider=${encodeURIComponent(provider)}`, z.array(LlmModelSchema), undefined, undefined, true)
/** TỐN token thật (BE ghi usage purpose=MODEL_TEST). */
export const postLlmModelTest = (model: string) => request('POST', '/llm/models/test', GatewayTestSchema, { model }, undefined, true)
