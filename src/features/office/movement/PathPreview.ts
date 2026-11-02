import { Graphics } from 'pixi.js'
import type { Point } from '../nav/NavGrid'

const DASH = 12
const GAP = 9

/** Nét đứt mờ thể hiện đường còn lại của một người đang đi. Dùng lại MỘT Graphics (clear + vẽ lại), không tạo mới. */
export class PathPreview extends Graphics {
  constructor() {
    super()
    this.eventMode = 'none' // không chắn thao tác chuột bên dưới
    this.visible = false
  }

  show(points: Point[], color = '#2563eb') {
    this.clear()
    for (let i = 1; i < points.length; i++) this.dashedSegment(points[i - 1], points[i])
    this.stroke({ width: 3, color, alpha: 0.45, cap: 'round' })
    const end = points[points.length - 1]
    this.circle(end.x, end.y, 6).fill({ color, alpha: 0.5 })
    this.visible = true
  }

  hide() { this.clear(); this.visible = false }

  private dashedSegment(a: Point, b: Point) {
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (len < 1) return
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len
    for (let d = 0; d < len; d += DASH + GAP) {
      const e = Math.min(d + DASH, len)
      this.moveTo(a.x + ux * d, a.y + uy * d).lineTo(a.x + ux * e, a.y + uy * e)
    }
  }
}
