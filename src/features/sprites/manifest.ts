import { z } from 'zod'
import { ANIM_TABLE } from './config.ts'

const Pack = z.object({
  id: z.string().min(1),
  name: z.string(),
  author: z.string().default(''),
  sourceUrl: z.string().default(''),
  /** Rỗng = chưa khai báo giấy phép (assets:check sẽ cảnh báo). */
  license: z.string().default(''),
  attributionRequired: z.boolean().default(false),
  notes: z.string().default(''),
})

const Tuple2 = z.tuple([z.number(), z.number()])

const CharacterLayer = z.object({
  id: z.string().min(1),
  kind: z.enum(['body', 'hair', 'outfit', 'accessory']),
  style: z.string(),
  atlas: z.string(),
  tintable: z.boolean().default(false),
  /** Thứ tự vẽ giữa các lớp (nhỏ vẽ trước). Gợi ý: body 0, outfit 10, hair 20, accessory 30. */
  order: z.number().int(),
  /** Avatar dựng sẵn (một lớp đã gồm cả quần áo/tóc): không thêm lớp hình tạm nào khác lên trên. */
  prebuilt: z.boolean().default(false),
  pack: z.string(),
})

const Prop = z.object({
  catalogKey: z.string().min(1),
  atlas: z.string(),
  frame: z.string().optional(),
  animation: z.string().optional(),
  /** Anchor mặc định (0,1) = góc dưới-trái của footprint. */
  anchor: Tuple2.default([0, 1]),
  offsetPx: Tuple2.default([0, 0]),
  /** state -> tên hoạt ảnh/khung trong atlas. */
  states: z.record(z.string(), z.string()).default({}),
}).refine((p) => p.frame || p.animation || Object.keys(p.states).length > 0, 'prop cần frame, animation hoặc states')

const Tile = z.object({ pattern: z.string(), atlas: z.string(), frame: z.string().optional(), tintable: z.boolean().default(true) })
const CarryPoint = z.object({ frame: z.number().int(), x: z.number(), y: z.number() })
const AnimSpecSchema = z.object({ frames: z.number().int().positive(), fps: z.number().positive(), level: z.enum(['A', 'B']) })

export const ManifestSchema = z.object({
  version: z.number().int(),
  tileSize: z.number().int().positive().default(32),
  /** 1 = tài nguyên 32 px; 2 = gói 16 px phóng gấp đôi. */
  assetScale: z.union([z.literal(1), z.literal(2)]).default(1),
  /** true => texture 'nearest' + làm tròn pixel; false => 'linear'. */
  pixelArt: z.boolean().default(true),
  packs: z.array(Pack).default([]),
  characterLayers: z.array(CharacterLayer).default([]),
  props: z.array(Prop).default([]),
  tiles: z.array(Tile).default([]),
  emotes: z.record(z.string(), z.object({ atlas: z.string(), frame: z.string() })).default({}),
  carryOffsets: z.object({ down: z.array(CarryPoint), up: z.array(CarryPoint), side: z.array(CarryPoint) })
    .default({ down: [], up: [], side: [] }),
  animations: z.record(z.string(), AnimSpecSchema).default(ANIM_TABLE),
}).superRefine((m, ctx) => {
  const packs = new Set(m.packs.map((p) => p.id))
  m.characterLayers.forEach((l, i) => {
    if (!packs.has(l.pack)) ctx.addIssue({ code: 'custom', path: ['characterLayers', i, 'pack'], message: `gói "${l.pack}" chưa khai báo trong packs` })
  })
})

export type Manifest = z.infer<typeof ManifestSchema>
export type CharacterLayerDef = Manifest['characterLayers'][number]

export const EMPTY_MANIFEST: Manifest = ManifestSchema.parse({ version: 1 })

/** Parse + báo lỗi dễ đọc (đường dẫn field sai). */
export function parseManifest(json: unknown): Manifest {
  const r = ManifestSchema.safeParse(json)
  if (r.success) return r.data
  throw new Error('manifest.json không hợp lệ: ' + r.error.issues.map((i) => `${i.path.join('.') || '(gốc)'}: ${i.message}`).join('; '))
}
