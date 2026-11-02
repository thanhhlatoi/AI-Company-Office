import { z } from 'zod'

// Tầng văn phòng + bố cục XUẤT BẢN (đơn vị: ô 32px). BE chưa có -> xem docs/MISSING_API.md mục K.
const Int = z.number().int()
export const RectSchema = z.object({ x: Int, y: Int, w: Int.positive(), h: Int.positive() })
export const SideSchema = z.enum(['n', 's', 'e', 'w'])

export const FloorSchema = z.object({ id: z.string(), slug: z.string(), name: z.string(), order: Int })
export type Floor = z.infer<typeof FloorSchema>

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['department', 'corridor', 'lobby']),
  departmentId: z.string().nullable().default(null),
  /** Gồm cả vòng tường ngoài cùng (nếu `walls`). */
  rect: RectSchema,
  walls: z.boolean().default(true),
  floorStyle: z.object({ pattern: z.string(), color: z.string() }),
  wallColor: z.string().default('#e2e8f0'),
  /** Cửa = ô trên vòng tường bị khoét; `side` = cạnh phòng chứa cửa. */
  doors: z.array(z.object({ x: Int, y: Int, side: SideSchema })).default([]),
})
export type Room = z.infer<typeof RoomSchema>

export const FloorObjectSchema = z.object({
  id: z.string(),
  catalogKey: z.string(),
  x: Int, // ô trên-trái của footprint
  y: Int,
  /** Đồ vật đi theo một agent (màn hình trên bàn của họ). */
  agentId: z.string().nullable().default(null),
  /** Đồ vật gắn với thiết bị (tủ rack: đèn theo số liệu thiết bị). */
  deviceId: z.string().nullable().default(null),
})
export type FloorObject = z.infer<typeof FloorObjectSchema>

/** Gán bàn: agent ngồi ở ghế (object) nào, quay về hướng nào. */
export const SeatSchema = z.object({ agentId: z.string(), objectId: z.string(), facing: z.enum(['up', 'down', 'left', 'right']) })
export type Seat = z.infer<typeof SeatSchema>

export const LayoutSchema = z.object({
  floorSlug: z.string(),
  version: Int,
  width: Int.positive(),
  height: Int.positive(),
  rooms: z.array(RoomSchema),
  objects: z.array(FloorObjectSchema),
  seats: z.array(SeatSchema),
})
export type Layout = z.infer<typeof LayoutSchema>
