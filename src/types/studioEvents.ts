import { z } from 'zod'
import { EventId, Id } from './common'
import { DocumentSchema } from './knowledge'
import { MemoryItemSchema } from './memory'
import { HealthSchema } from './models'
import { ToolCallLogSchema } from './tools'

// Realtime của Prompt 4D (GIẢ ĐỊNH). Gộp vào RealtimeMessageSchema ở types/index.ts.
export const StudioEventSchemas = [
  z.object({ id: EventId, type: z.literal('grant.changed'), agentId: Id, toolId: Id.nullish() }),
  z.object({ id: EventId, type: z.literal('tool.denied'), log: ToolCallLogSchema }),
  z.object({ id: EventId, type: z.literal('model.health_changed'), modelId: Id, health: HealthSchema }),
  z.object({ id: EventId, type: z.literal('document.status_changed'), document: DocumentSchema }),
  z.object({ id: EventId, type: z.literal('memory.pending_review'), item: MemoryItemSchema }),
  z.object({ id: EventId, type: z.literal('template.instantiated'), templateId: Id, agentId: Id }),
] as const
