import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LayoutSchema } from '../../types/floor.ts'
import type { Layout } from '../../types/floor.ts'
import { N, E, S, W, buildCells, changedChunks, chunkSignatures, wallVariant } from './grid.ts'
import { distribute, generateFloors, generateLayout, type DeptInput } from './layoutGen.ts'

const dept = (slug: string, staff: number): DeptInput => ({
  id: slug, slug, name: slug, floor: '#fbf3e0', wall: '#e8d5a8',
  members: [{ id: `${slug}-h`, isHead: true }, ...Array.from({ length: staff }, (_, i) => ({ id: `${slug}-${i}`, isHead: false }))],
})
const DEPTS = [dept('a', 5), dept('b', 2), dept('ha-tang', 7), dept('c', 0), dept('d', 3), dept('e', 4), dept('f', 6)]
const FLAT = (k: string) => k === 'rug'
const SIZE = (k: string) => (k === 'rug' ? { w: 3, h: 2 } : { w: 1, h: 1 })

test('distribute chia đều, tầng đầu nhận phần dư', () => {
  assert.deepEqual(distribute(7, 3), [3, 2, 2])
  assert.deepEqual(distribute(2, 3), [1, 1, 0])
})

test('bố cục sinh ra hợp lệ theo schema; mọi agent có đúng một ghế trong phòng của mình', () => {
  const { floors, layouts } = generateFloors(DEPTS, 3)
  assert.equal(floors.length, 3)
  const ids = new Set<string>()
  for (const l of layouts) {
    LayoutSchema.parse(l)
    for (const s of l.seats) {
      assert.ok(!ids.has(s.agentId), `agent ${s.agentId} có hai ghế`)
      ids.add(s.agentId)
      const chair = l.objects.find((o) => o.id === s.objectId)!
      const room = l.rooms.find((r) => r.kind === 'department' && chair.x > r.rect.x && chair.x < r.rect.x + r.rect.w - 1 && chair.y > r.rect.y && chair.y < r.rect.y + r.rect.h - 1)
      assert.ok(room, `ghế của ${s.agentId} nằm ngoài phòng`)
    }
  }
  assert.equal(ids.size, DEPTS.reduce((n, d) => n + d.members.length, 0))
})

test('đồ vật không chồng footprint (trừ màn hình trên bàn và thảm phẳng) và nằm trong layout', () => {
  for (const l of generateFloors(DEPTS, 3).layouts) {
    const seen = new Map<string, string>()
    for (const o of l.objects) {
      if (o.catalogKey === 'monitor' || FLAT(o.catalogKey)) continue
      const { w, h } = o.catalogKey === 'desk' ? { w: 3, h: 2 } : o.catalogKey === 'whiteboard' ? { w: 3, h: 1 } : { w: 1, h: 1 }
      for (let j = o.y; j < o.y + h; j++) for (let i = o.x; i < o.x + w; i++) {
        assert.ok(i < l.width && j < l.height, `${o.id} ra ngoài layout`)
        assert.equal(seen.get(`${i},${j}`), undefined, `${o.id} đè ${seen.get(`${i},${j}`)} tại ${i},${j}`)
        seen.set(`${i},${j}`, o.id)
      }
    }
  }
})

test('tường autotile: mặt nạ đúng ở góc, cạnh; cửa là khoảng hở; tường phía nam thấp', () => {
  const l = generateLayout('t', [dept('a', 2)])
  const cells = buildCells(l)
  const room = l.rooms[0].rect
  const at = (x: number, y: number) => cells.get(y * l.width + x)!
  assert.equal(at(room.x, room.y).wall!.mask, E | S) // góc tây-bắc
  assert.equal(at(room.x + room.w - 1, room.y).wall!.mask, S | W) // góc đông-bắc
  assert.equal(at(room.x + 2, room.y).wall!.mask, E | W) // thẳng ngang
  assert.equal(at(room.x, room.y + 3).wall!.mask, N | S) // thẳng đứng
  assert.equal(at(room.x + 2, room.y).wall!.low, false) // tường bắc: cao
  const door = l.rooms[0].doors[0]
  assert.equal(at(door.x, door.y).wall, undefined)
  assert.deepEqual(at(door.x, door.y).door, { axis: 'h', low: true })
  assert.equal(at(door.x - 1, door.y).wall!.mask & E, 0) // đầu tường cụt tại cửa
  assert.equal(at(room.x + 1, room.y + room.h - 1).wall!.low, true)
  assert.equal(wallVariant(5, true), 'wall_low_5')
})

test('đủ 16 mặt nạ xuất hiện khi dựng từ các hình tường khác nhau', () => {
  const masks = new Set<number>()
  const box = (x: number, y: number, w: number, h: number) => ({ id: `${x}${y}`, name: '', kind: 'department' as const, departmentId: null, rect: { x, y, w, h }, walls: true, floorStyle: { pattern: 'plain', color: '#fff' }, wallColor: '#ccc', doors: [] })
  const l: Layout = { floorSlug: 'x', version: 1, width: 30, height: 20, objects: [], seats: [], rooms: [box(1, 1, 7, 7), box(7, 1, 7, 7), box(1, 7, 7, 7), box(7, 7, 7, 7), box(18, 1, 3, 3), box(24, 5, 1, 4), box(28, 1, 1, 1)] }
  l.rooms[0].doors = [{ x: 3, y: 1, side: 'n' }]
  for (const c of buildCells(l).values()) if (c.wall) masks.add(c.wall.mask)
  for (const m of [0, N, E, S, W, N | S, E | W, E | S, S | W, N | E, N | W, N | E | S, E | S | W, N | S | W, N | E | W, N | E | S | W]) assert.ok(masks.has(m), `thiếu mặt nạ ${m}`)
})

test('đổi màu sàn một phòng chỉ làm đổi các chunk giao với phòng đó', () => {
  const layout = generateFloors(DEPTS, 1).layouts[0]
  const sigs = () => chunkSignatures(layout, buildCells(layout), FLAT, SIZE)
  const before = sigs()
  assert.ok(before.size >= 4)
  const target = layout.rooms.find((r) => r.kind === 'department' && r.departmentId === 'c')! // phòng nhỏ, không phải phòng đầu
  target.floorStyle = { ...target.floorStyle, color: '#112233' }
  const { rebuild, remove } = changedChunks(before, sigs())
  assert.ok(rebuild.length > 0 && rebuild.length < before.size, `${rebuild.length}/${before.size}`)
  assert.deepEqual(remove, [])
  const { x, y, w, h } = target.rect
  for (const k of rebuild) {
    const [cx, cy] = k.split(',').map(Number)
    assert.ok(cx * 16 <= x + w && cx * 16 + 15 >= x && cy * 16 <= y + h && cy * 16 + 15 >= y, `chunk ${k} không giao phòng`)
  }
})

test('không đổi gì thì không chunk nào phải vẽ lại; thảm phẳng dịch chuyển chỉ ảnh hưởng chunk liên quan', () => {
  const l = generateFloors(DEPTS, 1).layouts[0]
  const a = chunkSignatures(l, buildCells(l), FLAT, SIZE)
  assert.deepEqual(changedChunks(a, chunkSignatures(l, buildCells(l), FLAT, SIZE)), { rebuild: [], remove: [] })
  l.objects.find((o) => o.catalogKey === 'rug')!.x += 1
  assert.ok(changedChunks(a, chunkSignatures(l, buildCells(l), FLAT, SIZE)).rebuild.length >= 1)
})

test('schema bố cục lỗi bị từ chối', () => {
  assert.throws(() => LayoutSchema.parse({ floorSlug: 'x' }))
  const l = generateLayout('t', [dept('a', 1)])
  assert.throws(() => LayoutSchema.parse({ ...l, rooms: [{ ...l.rooms[0], rect: { x: 0, y: 0, w: 0, h: 3 } }] }))
})
