import { Container, Graphics, Rectangle, Text } from 'pixi.js'
import { roomProps } from '../../config/departments'
import { paletteFor } from '../../styles/tokens'
import type { DepartmentStats } from '../../store/selectors'
import type { Department } from '../../types'
import type { Rect } from './layout'
import { DOOR_W } from './nav/constants'
import { placeProps } from './props'
import type { Prop } from './props/types'

const TILE = 48

export interface RoomHandlers {
  onTap: (deptId: string) => void
  onSignTap: (deptId: string) => void
  onAddAgent: (deptId: string) => void
}
const FAR_TITLE_SCALE = 1.15 // zoom xa: phóng biển tên để vẫn đọc được
const FAR_HUD_SCALE = 1.5

/** Sàn (kẻ ô + thảm), tường kính, ánh sáng, biển tên và đồ trang trí của một phòng. */
export class RoomView extends Container {
  readonly deptId: string
  private shadow = new Graphics()
  private floor = new Graphics()
  private bar = new Graphics()
  private propLayer = new Container()
  private props: Prop[] = []
  private title = new Text({ text: '', resolution: 3, style: { fontFamily: 'Inter, sans-serif', fontSize: 30, fontWeight: '700', letterSpacing: 1.5, fill: '#000000' } })
  private key = ''
  private statsKey = ''
  // Thẻ số liệu chỉ hiện khi zoom xa: đang làm / tổng, số lỗi
  private hud = new Container()
  private chip = new Graphics()
  private chipText = new Text({ text: '', resolution: 3, style: { fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: '700', fill: '#000000' } })
  private accent = '#000000'
  private signHit = new Graphics()
  private empty = new Container()
  private emptyButton = new Container()
  private handlers!: RoomHandlers
  private wasDragged!: () => boolean

  constructor(deptId: string, h: RoomHandlers, wasDragged: () => boolean) {
    super()
    this.deptId = deptId
    this.title.anchor.set(0.5, 0)
    this.chipText.anchor.set(0.5)
    this.chipText.position.set(0, 16)
    this.hud.addChild(this.chip, this.chipText)
    this.hud.visible = false
    this.addChild(this.shadow, this.floor, this.bar, this.title, this.signHit, this.propLayer, this.hud, this.empty)
    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.on('pointertap', () => { if (!wasDragged()) h.onTap(deptId) })
    // Biển tên: bấm để mở panel phòng ban (không kích hoạt thao tác bấm cả phòng)
    this.signHit.eventMode = 'static'
    this.signHit.cursor = 'pointer'
    this.signHit.on('pointertap', (e) => { e.stopPropagation(); if (!wasDragged()) h.onSignTap(deptId) })
    // Phòng trống: hình minh hoạ + nút thêm agent
    this.empty.visible = false
    this.handlers = h
    this.wasDragged = wasDragged
  }

  update(dept: Department, r: Rect, rug: Rect | null) {
    this.position.set(r.x, r.y)
    const key = `${dept.name}|${dept.slug}|${dept.color}|${r.w}|${r.h}|${rug ? 1 : 0}`
    if (key === this.key) return // không vẽ lại khi không đổi
    this.key = key
    const p = paletteFor(dept.color)
    this.accent = p.accent
    const { w, h } = r

    // bóng mềm = vài lớp mờ chồng lên nhau (rẻ hơn filter blur)
    this.shadow.clear()
      .roundRect(0, 14, w, h, 28).fill({ color: '#0f172a', alpha: 0.05 })
      .roundRect(0, 8, w, h, 28).fill({ color: '#0f172a', alpha: 0.06 })

    const f = this.floor.clear().roundRect(0, 0, w, h, 28).fill(p.floor)
    for (let x = TILE; x < w - 12; x += TILE) f.moveTo(x, 14).lineTo(x, h - 14) // sàn kẻ ô
    for (let y = TILE; y < h - 12; y += TILE) f.moveTo(14, y).lineTo(w - 14, y)
    f.stroke({ width: 1, color: p.accent, alpha: 0.07 })
    if (rug) {
      f.roundRect(rug.x, rug.y, rug.w, rug.h, 24).fill({ color: p.accent, alpha: 0.08 })
        .roundRect(rug.x + 10, rug.y + 10, rug.w - 20, rug.h - 20, 18).stroke({ width: 2, color: p.accent, alpha: 0.22 })
    }
    // hai dải nắng chéo xuyên qua kính
    f.poly([w * 0.6, 0, w * 0.7, 0, w * 0.38, h, w * 0.28, h]).fill({ color: '#ffffff', alpha: 0.18 })
    f.poly([w * 0.76, 0, w * 0.8, 0, w * 0.48, h, w * 0.44, h]).fill({ color: '#ffffff', alpha: 0.12 })
    // tường kính: viền ngoài bán trong suốt + viền sáng bên trong; tường sau (phía trên) dày hơn
    f.roundRect(0, 0, w, h, 28).stroke({ width: 10, color: p.wall, alpha: 0.8, alignment: 1 })
    f.roundRect(10, 10, w - 20, h - 20, 20).stroke({ width: 2, color: '#ffffff', alpha: 0.7 })
    f.rect(14, 10, w - 28, 8).fill({ color: p.wall, alpha: 0.9 })

    // Cửa: hai ô đi được ở giữa tường trên và tường dưới (khớp lưới đường đi, xem nav/buildNav.ts)
    for (const y of [0, h]) {
      f.roundRect(w / 2 - DOOR_W / 2, y - 7, DOOR_W, 14, 4).fill('#ffffff').stroke({ width: 2, color: p.accent, alpha: 0.5 })
      f.rect(w / 2 - DOOR_W / 2 - 4, y - 9, 8, 18).fill(p.accent).rect(w / 2 + DOOR_W / 2 - 4, y - 9, 8, 18).fill(p.accent)
    }
    this.title.text = dept.name.toUpperCase()
    this.title.style.fill = p.accent
    this.title.position.set(w / 2, 28)
    this.bar.clear().roundRect(w / 2 - 40, 72, 80, 5, 3).fill(p.accent)
    this.hud.position.set(w / 2, 88)
    this.statsKey = '' // màu phòng/kích thước đổi -> vẽ lại thẻ số liệu
    this.hitArea = new Rectangle(0, 0, w, h)
    const sw = this.title.width + 48
    this.signHit.clear().rect(w / 2 - sw / 2, 14, sw, 72).fill({ color: '#ffffff', alpha: 0.001 })
    this.drawEmpty(w, h, p.accent)

    // đồ trang trí theo config
    this.props.length = 0
    this.propLayer.removeChildren().forEach((c) => c.destroy({ children: true }))
    for (const prop of placeProps(roomProps(dept.slug, dept.props), w)) {
      this.props.push(prop)
      this.propLayer.addChild(prop.view)
    }
  }

  /** Phòng chưa có ai: bàn trống nét đứt + nút thêm agent. */
  private drawEmpty(w: number, h: number, accent: string) {
    this.empty.removeChildren().forEach((c) => c.destroy({ children: true }))
    this.emptyButton = new Container()
    this.emptyButton.eventMode = 'static'
    this.emptyButton.cursor = 'pointer'
    this.emptyButton.on('pointertap', (e) => { e.stopPropagation(); if (!this.wasDragged()) this.handlers.onAddAgent(this.deptId) })
    const cx = w / 2, cy = Math.max(300, h / 2)
    const art = new Graphics()
    art.roundRect(cx - 70, cy - 10, 140, 62, 10).fill({ color: accent, alpha: 0.06 }).stroke({ width: 3, color: accent, alpha: 0.35 })
    art.circle(cx, cy - 38, 18).fill({ color: accent, alpha: 0.12 }).roundRect(cx - 26, cy - 18, 52, 24, 10).fill({ color: accent, alpha: 0.12 })
    const msg = new Text({ text: 'Phòng chưa có ai', resolution: 3, style: { fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: '600', fill: accent } })
    msg.anchor.set(0.5)
    msg.position.set(cx, cy + 84)
    const label = new Text({ text: '+ Thêm agent vào phòng', resolution: 3, style: { fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: '600', fill: '#ffffff' } })
    label.anchor.set(0.5)
    const bw = label.width + 36
    const bg = new Graphics().roundRect(-bw / 2, -18, bw, 36, 18).fill(accent)
    this.emptyButton.addChild(bg, label)
    this.emptyButton.position.set(cx, cy + 128)
    this.empty.addChild(art, msg, this.emptyButton)
  }

  /** Thẻ số liệu: "3/7 đang làm · 1 lỗi". Chỉ vẽ lại khi số đổi. */
  setStats(st: DepartmentStats) {
    this.empty.visible = st.total === 0
    const key = `${st.working}|${st.total}|${st.error}|${this.accent}`
    if (key === this.statsKey) return
    this.statsKey = key
    this.chipText.text = `${st.working}/${st.total} đang làm${st.error ? `  ·  ${st.error} lỗi` : ''}`
    this.chipText.style.fill = st.error ? '#b91c1c' : '#0f172a'
    const w = this.chipText.width + 28
    this.chip.clear().roundRect(-w / 2, 0, w, 32, 16).fill({ color: st.error ? '#fee2e2' : '#ffffff', alpha: 0.95 }).stroke({ width: 2, color: st.error ? '#dc2626' : this.accent })
  }

  /** Mức chi tiết theo zoom: xa -> biển tên to + thẻ số liệu; gần -> bình thường. */
  setLod(far: boolean) {
    this.hud.visible = far
    this.hud.scale.set(far ? FAR_HUD_SCALE : 1)
    this.title.scale.set(far ? FAR_TITLE_SCALE : 1)
    this.bar.visible = !far
  }

  animate(now: number) { for (const p of this.props) p.animate?.(now) }
}
