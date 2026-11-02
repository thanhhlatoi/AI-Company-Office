import { z } from 'zod'
import { Id, Micro, pageOf } from './common.ts'

// ---- Kho tài liệu (GIẢ ĐỊNH) ----
export const SensitivitySchema = z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'])
export type Sensitivity = z.infer<typeof SensitivitySchema>
export const AccessSchema = z.enum(['NONE', 'READ', 'WRITE'])
export type Access = z.infer<typeof AccessSchema>

export const CollectionSchema = z.object({
  id: Id, name: z.string(), description: z.string().default(''),
  sensitivity: SensitivitySchema,
  scope: z.object({ kind: z.enum(['SHARED', 'DEPARTMENT', 'AGENT']), id: Id.nullish() }),
  docCount: z.number().default(0),
  indexState: z.enum(['READY', 'INDEXING', 'REINDEXING', 'FAILED']).default('READY'),
  reindexPct: z.number().nullish(),
  embeddingModel: z.object({ id: Id, label: z.string(), dataClass: z.enum(['LOCAL', 'CLOUD']) }),
  embeddingCostMicro: Micro.default(0),
  chunking: z.object({ size: z.number(), overlap: z.number() }).prefault({ size: 800, overlap: 100 }),
  syncFolder: z.string().nullish(), // thư mục NAS đồng bộ vào bộ sưu tập (nếu có)
  /** Ai được đọc: kind ALL = mọi agent */
  acl: z.array(z.object({ kind: z.enum(['ALL', 'DEPARTMENT', 'AGENT']), id: Id.nullish(), access: AccessSchema })).default([]),
})
export type Collection = z.infer<typeof CollectionSchema>

export const DOC_STAGES = ['EXTRACTING', 'CHUNKING', 'EMBEDDING', 'READY'] as const
export const DocumentSchema = z.object({
  id: Id, collectionId: Id, name: z.string(),
  mime: z.string().default(''), sizeBytes: z.number().default(0),
  status: z.enum(['UPLOADED', 'EXTRACTING', 'CHUNKING', 'EMBEDDING', 'READY', 'FAILED']),
  progressPct: z.number().default(0), // tiến trình của giai đoạn hiện tại
  errorCode: z.string().nullish(),
  trust: z.enum(['OWNER', 'EXTERNAL']).default('OWNER'), // EXTERNAL: task đọc sẽ bị đánh dấu nhiễm
  chunkCount: z.number().default(0),
  version: z.number().default(1),
  createdAt: z.string(),
})
export type KnowledgeDoc = z.infer<typeof DocumentSchema>
export const DocumentPageSchema = pageOf(DocumentSchema)

export const ChunkSchema = z.object({ id: Id, documentId: Id, index: z.number(), text: z.string(), page: z.number().nullish(), section: z.string().nullish(), tokens: z.number().default(0) })
export const ChunkPageSchema = pageOf(ChunkSchema)

export const SearchHitSchema = z.object({
  chunkId: Id, documentId: Id, documentName: z.string(), page: z.number().nullish(), text: z.string(),
  score: z.object({ vector: z.number().nullish(), keyword: z.number().nullish(), fused: z.number() }),
})
/** `visible=false`: agent được chọn không thấy bộ sưu tập này */
export const SearchResultSchema = z.object({ visible: z.boolean().default(true), hits: z.array(SearchHitSchema).default([]) })

export const EvalRunSchema = z.object({
  id: Id, at: z.string(), k: z.number(), recallAtK: z.number(), mrr: z.number(),
  misses: z.array(z.object({ question: z.string(), expected: z.string() })).default([]),
})
export const EvalSetSchema = z.object({ questions: z.array(z.object({ id: Id, question: z.string(), expected: z.string() })), runs: z.array(EvalRunSchema) })
export type EvalSet = z.infer<typeof EvalSetSchema>
export type Chunk = z.infer<typeof ChunkSchema>

export const EmbeddingModelSchema = z.object({ id: Id, label: z.string(), dataClass: z.enum(['LOCAL', 'CLOUD']), pricePerMTokMicro: Micro.default(0) })
export type EmbeddingModel = z.infer<typeof EmbeddingModelSchema>

export const CollectionInputSchema = z.object({
  name: z.string().trim().min(1, 'Cần tên bộ sưu tập'), description: z.string().default(''),
  sensitivity: SensitivitySchema,
  scope: z.object({ kind: z.enum(['SHARED', 'DEPARTMENT', 'AGENT']), id: z.string().nullish() }),
  embeddingModelId: z.string().min(1, 'Cần chọn model embedding'),
  chunking: z.object({ size: z.number().int().min(100), overlap: z.number().int().min(0) }),
  acl: z.array(z.object({ kind: z.enum(['ALL', 'DEPARTMENT', 'AGENT']), id: z.string().nullish(), access: AccessSchema })),
  syncFolder: z.string().nullish(),
})
export type CollectionInput = z.infer<typeof CollectionInputSchema>
export const EvalQuestionSchema = z.object({ id: Id, question: z.string(), expected: z.string() })
export type EvalRun = z.infer<typeof EvalRunSchema>
