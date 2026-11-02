import type { Layout } from '../../types/floor.ts'
import { hashId } from '../sprites/resolvePose.ts'

/** Chunk 16x16 ô: đơn vị cache texture. */
export const CHUNK = 16

export interface WallCell { mask: number; low: boolean; color: string }
export interface Cell {
  floor?: { pattern: string; color: string }
  wall?: WallCell
  /** Cửa: khoảng hở trên tường, vẽ khung cửa. */
  door?: { axis: 'h' | 'v'; low: boolean }
  /** Bit 1/2/4/8 = N/E/S/W: cạnh tiếp giáp ô sàn khác kiểu hoặc ngoài sàn (vẽ viền chuyển tiếp mềm). */
  edge: number
}
export const N = 1, E = 2, S = 4, W = 8
export const wallVariant = (mask: number, low: boolean) => `wall_${low ? 'low_' : ''}${mask}`
export const doorVariant = (axis: 'h' | 'v', low: boolean) => `door_${axis}${low ? '_low' : ''}`

/**
 * Dựng dữ liệu từng ô từ bố cục: sàn theo phòng (phòng khai báo trước thắng), tường = vòng ngoài của phòng có tường,
 * bỏ ô cửa, rồi autotile tường bằng mặt nạ 4 hướng (16 biến). Tường phía nam (hàng dưới cùng của phòng) vẽ thấp.
 */
export function buildCells(layout: Layout): Map<number, Cell> {
  const key = (x: number, y: number) => y * layout.width + x
  const cells = new Map<number, Cell>()
  const cell = (k: number) => { let c = cells.get(k); if (!c) cells.set(k, c = { edge: 0 }); return c }
  const walls = new Map<number, { low: boolean; color: string }>()
  const doors = new Map<number, 'h' | 'v'>()

  for (const r of layout.rooms) {
    const { x, y, w, h } = r.rect
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const c = cell(key(i, j))
      c.floor ??= r.floorStyle
      if (!r.walls || (i > x && i < x + w - 1 && j > y && j < y + h - 1)) continue
      const low = j === y + h - 1
      const prev = walls.get(key(i, j))
      walls.set(key(i, j), { low: low || !!prev?.low, color: prev?.color ?? r.wallColor }) // tường chung: thấp thắng, để không che người phía sau
    }
    for (const d of r.doors) doors.set(key(d.x, d.y), d.side === 'n' || d.side === 's' ? 'h' : 'v')
  }
  for (const k of doors.keys()) {
    const wl = walls.get(k)
    walls.delete(k)
    cell(k).door = { axis: doors.get(k) ?? 'h', low: !!wl?.low }
  }
  const has = (x: number, y: number) => walls.has(key(x, y))
  for (const [k, wl] of walls) {
    const x = k % layout.width, y = Math.floor(k / layout.width)
    cell(k).wall = { mask: (has(x, y - 1) ? N : 0) | (has(x + 1, y) ? E : 0) | (has(x, y + 1) ? S : 0) | (has(x - 1, y) ? W : 0), low: wl.low, color: wl.color }
  }
  const sig = (x: number, y: number) => { const f = cells.get(key(x, y))?.floor; return f ? `${f.pattern}${f.color}` : '' }
  for (const [k, c] of cells) {
    if (!c.floor) continue
    const x = k % layout.width, y = Math.floor(k / layout.width), me = sig(x, y)
    c.edge = (sig(x, y - 1) !== me ? N : 0) | (sig(x + 1, y) !== me ? E : 0) | (sig(x, y + 1) !== me ? S : 0) | (sig(x - 1, y) !== me ? W : 0)
  }
  return cells
}

const cellSig = (c: Cell | undefined) =>
  c ? `${c.floor ? `${c.floor.pattern}${c.floor.color}` : '-'}|${c.wall ? `${c.wall.mask}${c.wall.low}${c.wall.color}` : '-'}|${c.door ? `${c.door.axis}${c.door.low}` : '-'}|${c.edge}` : ''

/** Chữ ký từng chunk (nội dung nền tĩnh + đồ vật phẳng đè lên chunk). Chunk đổi chữ ký thì mới phải vẽ lại. */
export function chunkSignatures(layout: Layout, cells: Map<number, Cell>, isFlat: (key: string) => boolean, size: (key: string) => { w: number; h: number }): Map<string, number> {
  const parts = new Map<string, string[]>()
  const push = (cx: number, cy: number, s: string) => { const k = `${cx},${cy}`; const a = parts.get(k); if (a) a.push(s); else parts.set(k, [s]) }
  for (const [k, c] of cells) push(Math.floor((k % layout.width) / CHUNK), Math.floor(Math.floor(k / layout.width) / CHUNK), `${k}:${cellSig(c)}`)
  for (const o of layout.objects) {
    if (!isFlat(o.catalogKey)) continue
    const { w, h } = size(o.catalogKey)
    for (let cy = Math.floor(o.y / CHUNK); cy <= Math.floor((o.y + h - 1) / CHUNK); cy++)
      for (let cx = Math.floor(o.x / CHUNK); cx <= Math.floor((o.x + w - 1) / CHUNK); cx++) push(cx, cy, `o${o.id}:${o.catalogKey}@${o.x},${o.y}`)
  }
  return new Map([...parts].map(([k, a]) => [k, hashId(a.sort().join(';'))]))
}

/** Chunk cần vẽ lại giữa hai bộ chữ ký (đổi, mới, hoặc đã mất). */
export function changedChunks(prev: Map<string, number>, next: Map<string, number>): { rebuild: string[]; remove: string[] } {
  return { rebuild: [...next].filter(([k, v]) => prev.get(k) !== v).map(([k]) => k), remove: [...prev.keys()].filter((k) => !next.has(k)) }
}
