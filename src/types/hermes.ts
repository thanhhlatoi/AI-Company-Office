import { z } from 'zod'

// Hợp đồng API ĐỀ XUẤT cho đồng bộ bot Hermes (BE tự làm, FE không có mock). Xem docs/settings-ai.md mục Hermes.
export const HermesSyncStateSchema = z.enum(['SYNCED', 'NOT_SYNCED', 'MISSING', 'ERROR'])
export type HermesSyncState = z.infer<typeof HermesSyncStateSchema>

/** GET /hermes/status: so AgentOffice với Hermes. `missing` = agent chưa có bot sống trong Hermes; `orphans` = bot trong Hermes không còn agent. */
export const HermesStatusSchema = z.object({
  reachable: z.boolean(),
  checkedAt: z.string(),
  detail: z.string().optional(),
  agentsInOffice: z.number(),
  botsInHermes: z.number().nullable(),
  synced: z.number(),
  missing: z.number(),
  orphans: z.number(),
})
export type HermesStatus = z.infer<typeof HermesStatusSchema>

/** GET /hermes/agents và kết quả POST /agents/{id}/hermes/(sync|restart) */
export const HermesAgentSchema = z.object({
  agentId: z.string().or(z.number().transform(String)),
  name: z.string(),
  hermesBotId: z.string().nullable(),
  syncState: HermesSyncStateSchema,
  error: z.string().optional(),
  lastSyncedAt: z.string().optional(),
})
export type HermesAgent = z.infer<typeof HermesAgentSchema>
export const HermesAgentListSchema = z.array(HermesAgentSchema)

/** POST /hermes/sync-all */
export const SyncAllResultSchema = z.object({
  created: z.number(),
  updated: z.number(),
  failed: z.array(z.object({ agentId: z.string().or(z.number().transform(String)), error: z.string() })),
})
export type SyncAllResult = z.infer<typeof SyncAllResultSchema>
