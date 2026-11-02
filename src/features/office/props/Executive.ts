import { Container, Graphics } from 'pixi.js'
import { decoText, softShadow, type Prop } from './types'

/** Lá cây: đa giác 6 điểm, xoay `ang` (0 = hướng lên). */
function leaf(g: Graphics, x: number, y: number, ang: number, len: number, wid: number, color: string) {
  const [c, s] = [Math.cos(ang), Math.sin(ang)]
  const pts = [[0, 0], [wid * 0.5, -len * 0.3], [wid * 0.45, -len * 0.72], [0, -len], [-wid * 0.45, -len * 0.72], [-wid * 0.5, -len * 0.3]]
  g.poly(pts.flatMap(([px, py]) => [x + px * c - py * s, y + px * s + py * c])).fill(color)
}

/** Cây lớn trong chậu: lá đung đưa chậm quanh gốc. */
export function plant(): Prop {
  const W = 100, H = 140
  const view = new Container()
  const pot = new Graphics()
  pot.ellipse(W / 2, H - 4, 34, 7).fill({ color: '#0f172a', alpha: 0.12 })
  pot.roundRect(26, 100, 48, 36, 6).fill('#c2703d').roundRect(22, 96, 56, 10, 4).fill('#d98a54')
  const leaves = new Graphics()
  const colors = ['#16a34a', '#22c55e', '#15803d']
  ;[-70, -48, -26, -6, 14, 36, 58, 74].forEach((deg, i) => leaf(leaves, 0, 0, (deg * Math.PI) / 180, 70 + (i % 3) * 12, 26, colors[i % 3]))
  leaves.position.set(W / 2, 102) // gốc lá = tâm xoay
  view.addChild(pot, leaves)
  return { view, width: W, height: H, animate: (now) => { leaves.rotation = Math.sin(now / 1500) * 0.04 } }
}

/** Cấu hình bàn họp tròn: số ghế và bán kính mặt bàn. Dùng chung cho hình vẽ và lưới đường đi. */
export const MEETING_TABLES = {
  'meeting-table': { seats: 6, tableR: 42 },
  'meeting-table-large': { seats: 8, tableR: 58 },
} as const
export const CHAIR_GAP = 14 // ghế cách mép bàn
const chairRadius = (tableR: number) => tableR + CHAIR_GAP
export const meetingTableSize = (tableR: number) => 2 * (chairRadius(tableR) + 12)

/** Vị trí ghế (toạ độ so với góc trên trái của prop), dùng để vẽ ghế và làm điểm đến "ngồi họp". */
export function meetingSeats(seats: number, tableR: number): { x: number; y: number }[] {
  const c = meetingTableSize(tableR) / 2
  return Array.from({ length: seats }, (_, i) => {
    const a = (i / seats) * Math.PI * 2 - Math.PI / 2
    return { x: c + Math.cos(a) * chairRadius(tableR), y: c + Math.sin(a) * chairRadius(tableR) }
  })
}

/** Bàn họp tròn nhìn từ trên: ghế quanh bàn, giấy tờ và laptop. */
export function meetingTable(kind: keyof typeof MEETING_TABLES = 'meeting-table'): Prop {
  const { seats, tableR } = MEETING_TABLES[kind]
  const S = meetingTableSize(tableR), c = S / 2
  const g = new Graphics()
  g.circle(c, c + 8, tableR + 2).fill({ color: '#0f172a', alpha: 0.08 })
  for (const p of meetingSeats(seats, tableR)) g.circle(p.x, p.y, 11).fill('#a16207').stroke({ width: 2, color: '#78350f' })
  g.circle(c, c, tableR).fill('#d9c3a0').stroke({ width: 3, color: '#b89d76' }).circle(c, c, tableR - 12).stroke({ width: 1.5, color: '#b89d76', alpha: 0.7 })
  g.roundRect(c - 16, c - 24, 18, 22, 2).fill('#ffffff').roundRect(c + 4, c + 2, 18, 22, 2).fill('#ffffff')
  g.roundRect(c - 12, c + 6, 22, 14, 2).fill('#334155')
  const view = new Container()
  view.addChild(g)
  return { view, width: S, height: S }
}

/** Bảng mục tiêu quý: 3 thanh tiến độ. */
export function goalBoard(): Prop {
  const W = 150, H = 108
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 8)
  g.roundRect(0, 0, W, H, 8).fill('#ffffff').stroke({ width: 2, color: '#b89d76' })
  g.roundRect(0, 0, W, 26, 8).fill('#9a5f10').rect(0, 18, W, 8).fill('#9a5f10')
  ;[[0.8, '#16a34a'], [0.55, '#f59e0b'], [0.3, '#2563eb']].forEach(([v, color], i) => {
    const y = 40 + i * 20
    g.roundRect(14, y, 122, 10, 5).fill('#e2e8f0').roundRect(14, y, 122 * (v as number), 10, 5).fill(color as string)
  })
  const title = decoText('MỤC TIÊU QUÝ', 12, '#ffffff')
  title.anchor.set(0.5)
  title.position.set(W / 2, 13)
  const view = new Container()
  view.addChild(g, title)
  return { view, width: W, height: H }
}
