import { Container, Graphics } from 'pixi.js'
import type { NetworkLink } from '../../../types'

interface Pt { x: number; y: number }
const LANE_BASE = 44 // làn cáp đầu tiên nằm dưới đáy thiết bị từng này
const LANE_STEP = 5
const BEAD_SPEED = 0.07 // px/ms
const beadCount = (l: NetworkLink) => (!l.up || l.kbps < 100 ? 0 : l.kbps < 1500 ? 1 : l.kbps < 4000 ? 2 : 3)

interface Cable { path: Pt[]; len: number; beads: Graphics[] }

const lengthOf = (p: Pt[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q.x - p[i].x, q.y - p[i].y), 0)
function pointAt(path: Pt[], d: number): Pt {
  for (let i = 1; i < path.length; i++) {
    const seg = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
    if (d <= seg || i === path.length - 1) { const t = seg ? Math.min(1, d / seg) : 0; return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * t, y: path[i - 1].y + (path[i].y - path[i - 1].y) * t } }
    d -= seg
  }
  return path[0]
}

/** Cáp mạng trên sàn khu thiết bị: dây nối giữa các thiết bị, hạt sáng chạy theo chiều dữ liệu và tốc độ theo lưu lượng. Đứt thì đỏ nét đứt. */
export class DeviceCables extends Container {
  private lines = new Graphics()
  private cables: Cable[] = []
  private key = ''

  constructor() { super(); this.addChild(this.lines) }

  /** Dựng lại chỉ khi vị trí / trạng thái / mức lưu lượng đổi. */
  update(pos: Record<string, Pt>, links: NetworkLink[]) {
    const drawn = links.filter((l) => pos[l.fromDeviceId] && pos[l.toDeviceId])
    const key = JSON.stringify([pos, drawn.map((l) => [l.fromDeviceId, l.toDeviceId, l.up, beadCount(l)])])
    if (key === this.key) return
    this.key = key
    this.lines.clear()
    for (const c of this.cables) c.beads.forEach((b) => b.destroy())
    this.cables = drawn.map((l, k) => {
      const a = pos[l.fromDeviceId], b = pos[l.toDeviceId]
      const lane = Math.max(a.y, b.y) + LANE_BASE + (k % 6) * LANE_STEP
      const path = [{ x: a.x, y: a.y + 4 }, { x: a.x, y: lane }, { x: b.x, y: lane }, { x: b.x, y: b.y + 4 }]
      this.stroke(path, l.up)
      const beads = Array.from({ length: beadCount(l) }, () => this.addChild(new Graphics().circle(0, 0, 3.5).fill('#67e8f9').stroke({ width: 1, color: '#0e7490' })))
      return { path, len: lengthOf(path), beads }
    })
  }

  private stroke(path: Pt[], up: boolean) {
    if (up) {
      path.forEach((p, i) => (i ? this.lines.lineTo(p.x, p.y) : this.lines.moveTo(p.x, p.y)))
      this.lines.stroke({ width: 3, color: '#0e7490', alpha: 0.55, join: 'round' })
      return
    }
    // đứt: nét đứt đỏ (Graphics không có nét đứt sẵn nên vẽ từng đoạn ngắn)
    for (let i = 1; i < path.length; i++) {
      const [p, q] = [path[i - 1], path[i]]
      const n = Math.floor(Math.hypot(q.x - p.x, q.y - p.y) / 12)
      for (let s = 0; s < n; s += 2) this.lines.moveTo(p.x + ((q.x - p.x) * s) / n, p.y + ((q.y - p.y) * s) / n).lineTo(p.x + ((q.x - p.x) * (s + 1)) / n, p.y + ((q.y - p.y) * (s + 1)) / n)
    }
    this.lines.stroke({ width: 3, color: '#dc2626' })
  }

  animate(now: number, reduced: boolean) {
    for (const c of this.cables) c.beads.forEach((b, i) => {
      const p = pointAt(c.path, reduced ? ((i + 0.5) / c.beads.length) * c.len : (now * BEAD_SPEED + (i * c.len) / c.beads.length) % c.len)
      b.position.set(p.x, p.y)
    })
  }
}
