import type { Floor, FloorObject, Layout, Room, Seat } from '../../types/floor.ts'

/** Đầu vào bộ sinh bố cục (mock): phòng ban + thành viên; màu sàn/tường đã tính sẵn từ design tokens. */
export interface DeptInput { id: string; slug: string; name: string; floor: string; wall: string; /** thiết bị đặt trong tủ rack của phòng (phòng Hạ tầng) */ deviceIds?: string[]; members: { id: string; isHead: boolean }[] }

const PATTERNS = ['wood', 'carpet', 'tile', 'checker', 'plain']
const PITCH = 5 // một cụm bàn chiếm 5x5 ô (ghế 1 + bàn 2 + lối đi 2)
const CORRIDOR_H = 6
const LOBBY_W = 14

export const distribute = (n: number, k: number): number[] => Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0))

function roomSize(staff: number) {
  const cols = Math.min(5, Math.max(2, Math.ceil(staff / 2)))
  const rows = Math.ceil(staff / cols)
  return { cols, rows, w: cols * PITCH + 3, h: rows * PITCH + 8 }
}

/**
 * Bố cục mặc định một tầng: các phòng nằm cạnh nhau, hành lang + sảnh ở phía nam, cửa phòng mở xuống hành lang.
 * Mỗi agent một cụm bàn: ghế (có chỗ ngồi) ở phía bắc, bàn 3x2 phía nam, màn hình trên bàn; agent quay mặt xuống (về phía camera).
 */
export function generateLayout(floorSlug: string, depts: DeptInput[], version = 1): Layout {
  const sizes = depts.map((d) => roomSize(d.members.filter((m) => !m.isHead).length))
  const roomH = Math.max(8, ...sizes.map((s) => s.h))
  const rooms: Room[] = []
  const objects: FloorObject[] = []
  const seats: Seat[] = []
  const add = (id: string, catalogKey: string, x: number, y: number, agentId: string | null = null, deviceId: string | null = null) => objects.push({ id, catalogKey, x, y, agentId, deviceId })

  let rx = 1
  depts.forEach((d, di) => {
    const { cols, w } = sizes[di]
    const ry = 1
    rooms.push({
      id: `${floorSlug}-${d.slug}`, name: d.name, kind: 'department', departmentId: d.id, rect: { x: rx, y: ry, w, h: roomH }, walls: true,
      floorStyle: { pattern: PATTERNS[(di + floorSlug.length) % PATTERNS.length], color: d.floor }, wallColor: d.wall,
      doors: [{ x: rx + Math.floor(w / 2), y: ry + roomH - 1, side: 's' }],
    })
    const head = d.members.find((m) => m.isHead)
    const staff = d.members.filter((m) => m !== head)
    const cluster = (agentId: string, cx: number, cy: number) => {
      add(`${d.slug}-chair-${agentId}`, 'chair', cx + 1, cy, agentId)
      add(`${d.slug}-desk-${agentId}`, 'desk', cx, cy + 1)
      add(`${d.slug}-monitor-${agentId}`, 'monitor', cx + 1, cy + 1, agentId)
      seats.push({ agentId, objectId: `${d.slug}-chair-${agentId}`, facing: 'down' })
    }
    if (head) cluster(head.id, rx + Math.floor((w - 3) / 2), ry + 2)
    staff.forEach((m, i) => {
      const row = Math.floor(i / cols)
      const inRow = Math.min(cols, staff.length - row * cols)
      cluster(m.id, rx + 2 + (i % cols) * PITCH + Math.floor(((cols - inRow) * PITCH) / 2), ry + 7 + row * PITCH)
    })
    add(`${d.slug}-plant-w`, 'plant', rx + 1, ry + 1)
    add(`${d.slug}-plant-e`, 'plant', rx + w - 2, ry + 1)
    add(`${d.slug}-board`, d.slug === 'dieu-hanh' ? 'goal_board' : 'whiteboard', rx + 2, ry + 1)
    if (d.slug === 'ke-toan-thu-quy') add(`${d.slug}-safe`, 'safe', rx + w - 3, ry + 1)
    if (d.slug === 'ha-tang') (d.deviceIds ?? [null, null]).slice(0, 2).forEach((dev, i) => add(`${d.slug}-rack-${i + 1}`, 'server_rack', rx + w - 4 - i, ry + 1, null, dev))
    rx += w
  })

  const cy = 1 + roomH
  const width = Math.max(rx - 1 + 2, LOBBY_W + 2)
  const lobbyW = Math.min(LOBBY_W, width - 2)
  const band = { y: cy, h: CORRIDOR_H }
  rooms.push(
    { id: `${floorSlug}-lobby`, name: 'Sảnh', kind: 'lobby', departmentId: null, rect: { x: 1, y: band.y, w: lobbyW, h: band.h }, walls: false, floorStyle: { pattern: 'checker', color: '#f1f5f9' }, wallColor: '#e2e8f0', doors: [] },
    { id: `${floorSlug}-corridor`, name: 'Hành lang', kind: 'corridor', departmentId: null, rect: { x: 1, y: band.y, w: width - 2, h: band.h }, walls: false, floorStyle: { pattern: 'tile', color: '#e5e7eb' }, wallColor: '#e2e8f0', doors: [] },
  )
  add(`${floorSlug}-coffee`, 'coffee_machine', 3, cy)
  add(`${floorSlug}-lobby-plant-1`, 'plant', 2, cy)
  add(`${floorSlug}-lobby-plant-2`, 'plant', lobbyW, cy)
  add(`${floorSlug}-rug-1`, 'rug', 5, cy + 3)
  add(`${floorSlug}-rug-2`, 'rug', 9, cy + 3)
  return { floorSlug, version, width, height: cy + CORRIDOR_H + 1, rooms, objects, seats }
}

/** Chia phòng ban thành `floorCount` tầng (Tầng 1 trở đi) và sinh bố cục mặc định từng tầng. */
export function generateFloors(depts: DeptInput[], floorCount = 3): { floors: Floor[]; layouts: Layout[] } {
  const floors: Floor[] = []
  const layouts: Layout[] = []
  let at = 0
  distribute(depts.length, Math.min(floorCount, Math.max(1, depts.length))).forEach((n, i) => {
    const slug = `tang-${i + 1}`
    floors.push({ id: String(i + 1), slug, name: `Tầng ${i + 1}`, order: i })
    layouts.push(generateLayout(slug, depts.slice(at, at + n)))
    at += n
  })
  return { floors, layouts }
}
