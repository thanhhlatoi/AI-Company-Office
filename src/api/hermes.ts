import { request } from './http'
import { HermesAgentListSchema, HermesAgentSchema, HermesStatusSchema, SyncAllResultSchema } from '../types/hermes'

// Không có mock: cần BE thật (VITE_USE_MOCK=false). Chỗ duy nhất để gắn xác thực sau này (xem api/settingsAi.ts).
export const getHermesStatus = () => request('GET', '/hermes/status', HermesStatusSchema)
export const listHermesAgents = () => request('GET', '/hermes/agents', HermesAgentListSchema)
export const syncAllHermes = () => request('POST', '/hermes/sync-all', SyncAllResultSchema)
export const syncHermesAgent = (agentId: string) => request('POST', `/agents/${encodeURIComponent(agentId)}/hermes/sync`, HermesAgentSchema)
export const restartHermesBot = (agentId: string) => request('POST', `/agents/${encodeURIComponent(agentId)}/hermes/restart`, HermesAgentSchema)
