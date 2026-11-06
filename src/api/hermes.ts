import { request } from './http'
import { ChannelActionResultSchema, HermesAgentListSchema, HermesAgentSchema, HermesBotSchema, HermesChannelListSchema, HermesSkillDetailSchema, HermesSkillListSchema, HermesStatusSchema, SetSkillsResultSchema, SyncAllResultSchema, UpdateBotResultSchema, UpdateSkillResultSchema } from '../types/hermes'

// Không có mock: cần BE thật (VITE_USE_MOCK=false). Chỗ duy nhất để gắn xác thực sau này (xem api/settingsAi.ts).
export const getHermesStatus = () => request('GET', '/hermes/status', HermesStatusSchema)
export const listHermesAgents = () => request('GET', '/hermes/agents', HermesAgentListSchema)
export const syncAllHermes = () => request('POST', '/hermes/sync-all', SyncAllResultSchema)
export const syncHermesAgent = (agentId: string) => request('POST', `/agents/${encodeURIComponent(agentId)}/hermes/sync`, HermesAgentSchema)
export const restartHermesBot = (agentId: string) => request('POST', `/agents/${encodeURIComponent(agentId)}/hermes/restart`, HermesAgentSchema)

// Skill của bot Hermes theo agent. BE đổi agent -> bot; agent chưa có bot trả 409 "hãy đồng bộ trước".
const skillsPath = (agentId: string) => `/agents/${encodeURIComponent(agentId)}/hermes/skills`
export const listAgentSkills = (agentId: string) => request('GET', skillsPath(agentId), HermesSkillListSchema)
export const getAgentSkill = (agentId: string, skill: string) => request('GET', `${skillsPath(agentId)}/${encodeURIComponent(skill)}`, HermesSkillDetailSchema)
export const setAgentSkillsEnabled = (agentId: string, enabled: Record<string, boolean>) => request('PUT', skillsPath(agentId), SetSkillsResultSchema, { enabled })
export const updateAgentSkill = (agentId: string, skill: string, body: { enabled?: boolean; content?: string }) =>
  request('PUT', `${skillsPath(agentId)}/${encodeURIComponent(skill)}`, UpdateSkillResultSchema, body)

// Cấu hình bot Hermes của agent. Chỉ sửa model/provider/baseUrl/contextLength; SOUL và mô tả theo hồ sơ agent.
export const getAgentBot = (agentId: string) => request('GET', `/agents/${encodeURIComponent(agentId)}/hermes/bot`, HermesBotSchema)
export const updateAgentBot = (agentId: string, body: { model?: string; provider?: string; baseUrl?: string; contextLength?: number }) =>
  request('PUT', `/agents/${encodeURIComponent(agentId)}/hermes/bot`, UpdateBotResultSchema, body)

// Kênh YouTube của bot: đi thẳng qua plugin ytb, không qua AI. Không có đăng video.
export type ChannelAction = 'open' | 'close'
const channelsPath = (agentId: string) => `/agents/${encodeURIComponent(agentId)}/hermes/channels`
export const listAgentChannels = (agentId: string) => request('GET', channelsPath(agentId), HermesChannelListSchema)
export const agentChannelAction = (agentId: string, action: ChannelAction, name: string, machine: string) =>
  request('POST', `${channelsPath(agentId)}/${action}`, ChannelActionResultSchema, { name, machine })
