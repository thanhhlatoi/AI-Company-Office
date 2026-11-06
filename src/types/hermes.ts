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

// ---- Skill của bot Hermes (tab Skill của agent). Mỗi agent có bot riêng, skill tắt/bật theo từng bot. ----
export const HermesSkillSchema = z.object({
  name: z.string(),
  category: z.string().default(''), // '' = skill tự tạo, nằm ngoài thư mục nhóm
  description: z.string().nullish(),
  enabled: z.boolean(),
  path: z.string(),
})
export type HermesSkill = z.infer<typeof HermesSkillSchema>
export const HermesSkillListSchema = z.array(HermesSkillSchema)

/** Một skill kèm nội dung SKILL.md đầy đủ (chỉ tải khi mở trình sửa). */
export const HermesSkillDetailSchema = HermesSkillSchema.extend({ content: z.string() })
export type HermesSkillDetail = z.infer<typeof HermesSkillDetailSchema>

/** PUT .../hermes/skills (bật/tắt hàng loạt): trả lại cả danh sách mới. `needsRestart` = bot phải restart mới áp dụng. */
export const SetSkillsResultSchema = z.object({
  changed: z.array(z.string()),
  needsRestart: z.boolean().default(true),
  skills: HermesSkillListSchema,
})
export type SetSkillsResult = z.infer<typeof SetSkillsResultSchema>

/** PUT .../hermes/skills/{skill} (sửa nội dung và/hoặc bật/tắt một skill). */
export const UpdateSkillResultSchema = z.object({
  changed: z.array(z.string()),
  needsRestart: z.boolean().default(true),
  skill: HermesSkillDetailSchema,
})
export type UpdateSkillResult = z.infer<typeof UpdateSkillResultSchema>

// ---- Cấu hình thật của bot Hermes (tab "Bot Hermes" trong màn Cấu hình agent) ----
export const HermesBotSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  model: z.string().nullish(),
  provider: z.string().nullish(),
  baseUrl: z.string().nullish(),
  contextLength: z.number().nullish(),
  plugins: z.array(z.string()).default([]),
  skills: z.number().default(0), // số skill cài trong bot
  gateway: z.string().default('unknown'), // running | stopped | unknown...
  soul: z.string().default(''),
  /** Chỉ có TÊN biến .env và đã đặt giá trị hay chưa; giá trị không bao giờ về tới FE. */
  envKeys: z.array(z.object({ key: z.string(), set: z.boolean() })).default([]),
  terminal: z.string().nullish(),
  skillCategories: z.array(z.string()).default([]),
  cronFiles: z.number().default(0),
})
export type HermesBot = z.infer<typeof HermesBotSchema>

/** PUT .../hermes/bot: các trường đã đổi + profile mới. `needsRestart` = bot phải restart mới dùng cấu hình mới. */
export const UpdateBotResultSchema = z.object({
  changed: z.array(z.string()),
  needsRestart: z.boolean().default(true),
  profile: HermesBotSchema,
})
export type UpdateBotResult = z.infer<typeof UpdateBotResultSchema>

// ---- Kênh YouTube của bot (tab Kênh): mở/đóng Chrome, đi thẳng không qua AI
export const HermesChannelSchema = z.object({
  name: z.string(),
  machine: z.string(),
  group: z.string().nullable(),
  status: z.string(),
  imported: z.boolean(),
  hasLink: z.boolean(),
})
export type HermesChannel = z.infer<typeof HermesChannelSchema>
export const HermesChannelListSchema = z.object({
  machines: z.array(z.object({ key: z.string(), label: z.string(), online: z.boolean(), error: z.string().nullable() })),
  channels: z.array(HermesChannelSchema),
})
export const ChannelActionResultSchema = z.object({ name: z.string(), machine: z.string(), status: z.string().nullable() })
