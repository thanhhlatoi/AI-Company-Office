import { Container, Graphics, Text } from 'pixi.js'
import { TILE } from './constants'
import type { NavMap } from './buildNav'
import type { Point } from './NavGrid'

const label = (text: string, color: string) =>
  new Text({ text, resolution: 2, style: { fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: '700', fill: color, stroke: { color: '#ffffff', width: 3 } } })

/** Lớp debug (phím G): lưới ô, ô cản, cửa, điểm đích có tên, và đường đi hiện tại. Vẽ lại chỉ khi bố cục đổi. */
export class NavDebug extends Container {
  private map = new Graphics()
  private labels = new Container()
  private pathLine = new Graphics()
  private pathLabel = label('', '#0e7490')

  constructor() {
    super()
    this.visible = false
    this.eventMode = 'none' // không chặn thao tác bấm/kéo bên dưới
    this.addChild(this.map, this.labels, this.pathLine, this.pathLabel)
  }

  /** Vẽ lưới + vật cản + các điểm có tên. Gọi khi bật lớp debug hoặc khi bố cục đổi lúc đang bật. */
  draw(nav: NavMap) {
    const { grid, places, doors } = nav
    const m = this.map.clear()
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (!grid.isFree(c, r)) m.rect(grid.originX + c * TILE, grid.originY + r * TILE, TILE, TILE)
      }
    }
    m.fill({ color: '#ef4444', alpha: 0.28 })
    for (let c = 0; c <= grid.cols; c++) m.moveTo(grid.originX + c * TILE, grid.originY).lineTo(grid.originX + c * TILE, grid.originY + grid.rows * TILE)
    for (let r = 0; r <= grid.rows; r++) m.moveTo(grid.originX, grid.originY + r * TILE).lineTo(grid.originX + grid.cols * TILE, grid.originY + r * TILE)
    m.stroke({ width: 1, color: '#0f172a', alpha: 0.12 })
    for (const d of doors) m.rect(d.x, d.y, d.w, TILE).stroke({ width: 3, color: '#16a34a' }) // cửa
    for (const p of Object.values(places.seat)) m.circle(p.x, p.y, 4).fill('#f59e0b') // chỗ ngồi
    for (const p of Object.values(places.visit)) m.circle(p.x, p.y, 4).fill('#ea580c') // ô đứng cạnh bàn

    this.labels.removeChildren().forEach((c) => c.destroy())
    const named: [string, Point][] = [['cà phê', places.coffee], ['chờ duyệt', places.approval], ['phòng họp', places.meetingCenter]]
    for (const [name, p] of named) {
      m.circle(p.x, p.y, 6).fill('#2563eb')
      const t = label(name, '#1d4ed8')
      t.anchor.set(0.5, 1)
      t.position.set(p.x, p.y - 8)
      this.labels.addChild(t)
    }
    for (const p of places.meetingSeats) m.circle(p.x, p.y, 4).fill('#2563eb')
  }

  /** Vẽ đường đi (điểm đầu, các điểm rẽ, điểm cuối) cùng nhãn "N điểm · X px · Y ms". */
  setPath(path: Point[] | null, info = '') {
    const g = this.pathLine.clear()
    this.pathLabel.text = ''
    if (!path || path.length < 2) return
    g.poly(path.flatMap((p) => [p.x, p.y]), false).stroke({ width: 4, color: '#06b6d4', alpha: 0.9, join: 'round', cap: 'round' })
    path.forEach((p, i) => g.circle(p.x, p.y, i === 0 || i === path.length - 1 ? 7 : 5).fill(i === 0 ? '#16a34a' : i === path.length - 1 ? '#dc2626' : '#06b6d4'))
    const end = path[path.length - 1]
    this.pathLabel.text = info
    this.pathLabel.anchor.set(0.5, 1)
    this.pathLabel.position.set(end.x, end.y - 12)
  }
}
