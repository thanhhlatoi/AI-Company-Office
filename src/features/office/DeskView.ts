import { Container, Graphics, Rectangle, Text } from 'pixi.js'
import type { Agent } from '../../types'
import { VISIT_OFFSET } from './nav/constants'

const SCREEN_OFF = '#334155'
const SCREEN_ON = '#38bdf8'
const SCREEN_STANDBY = '#0f172a'

/** Bối cảnh từ phòng: màu phòng (ghế/khung trưởng phòng) và số màn hình mỗi bàn. */
export interface Look { accent: string; monitors: number; /** máy chủ của agent đang OFFLINE */ hostLost?: boolean; /** agent bị chặn vì hết ngân sách */ budgetBlocked?: boolean; /** model đang dùng: LOCAL / CLOUD, hoặc NONE = không có model hợp lệ */ modelTag?: 'LOCAL' | 'CLOUD' | 'NONE' | null }

/**
 * Bàn + ghế + màn hình (+ biển tên để bàn của trưởng phòng). Nằm yên một chỗ; người ngồi là AgentCharacter riêng.
 * Gốc (0,0) = giữa cạnh trên của bàn. `seatPoint` / `visitPoint` là toạ độ cục bộ.
 */
export class DeskView extends Container {
  /** Chỗ ngồi (giữa ghế): nhân vật đặt chân/mông ở đây. */
  readonly seatPoint = { x: 0, y: -10 }
  /** Ô đứng cạnh bàn để người khác tới nói chuyện (bên phải bàn). */
  visitPoint = { x: 60 + VISIT_OFFSET, y: 6 }
  private ring = new Graphics()
  private furniture = new Container() // bóng, ghế, bàn, khung màn hình, biển tên — dựng lại khi look đổi
  private screens = new Graphics() // phần sáng của màn hình
  private screenRects: { x: number; y: number }[] = []
  private working = false
  private seatEmpty = false
  private phase = 0
  private key = ''

  constructor(agentId: string) {
    super()
    this.phase = [...agentId].reduce((n, c) => n + c.charCodeAt(0), 0) * 97
    this.ring.visible = false
    this.addChild(this.ring, this.furniture, this.screens)
    this.eventMode = 'static'
    this.cursor = 'pointer'
  }

  update(a: Agent, look: Look) {
    const key = `${a.isHead}|${look.accent}|${look.monitors}|${a.isHead ? a.name : ''}`
    if (key === this.key) return
    this.key = key
    this.build(a, look)
    this.drawScreens()
  }

  private build(a: Agent, look: Look) {
    const head = a.isHead
    const k = head ? 1.4 : 1
    const dw = 120 * k, dh = 56 * k
    const monitors = head ? Math.max(2, look.monitors) : look.monitors
    this.furniture.removeChildren().forEach((c) => c.destroy({ children: true }))

    const g = new Graphics()
    g.roundRect(-dw / 2, 2, dw, dh, 10).fill({ color: '#0f172a', alpha: 0.06 }) // bóng mềm
    g.roundRect(-dw / 2, -3, dw, dh, 10).fill({ color: '#0f172a', alpha: 0.07 })
    const cw = head ? 56 : 48
    g.roundRect(-cw / 2, -46, cw, 42, 14).fill(head ? look.accent : '#94a3b8') // ghế
    g.roundRect(-dw / 2, -8, dw, dh, 8).fill(head ? '#c9a36b' : '#e2cfae').stroke({ width: 2, color: head ? '#8a6a3c' : '#b89d76' })
    const gap = head ? 56 : 46
    this.screenRects = []
    for (let i = 0; i < monitors; i++) {
      const cx = (i - (monitors - 1) / 2) * gap
      g.roundRect(cx - 20, 2, 40, 26, 3).fill('#1e293b')
      this.screenRects.push({ x: cx - 17, y: 5 })
    }
    this.furniture.addChild(g)

    if (head) {
      // biển tên để bàn: tấm đồng nhỏ ở mép trước bàn
      const t = new Text({ text: a.name, resolution: 3, style: { fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: '600', fill: '#6b4e0f' } })
      t.anchor.set(0.5)
      const w = Math.min(t.width, dw - 24) + 16
      t.position.set(0, dh - 8 - 14)
      const plaque = new Graphics().roundRect(-w / 2, dh - 8 - 23, w, 18, 4).fill('#f8e6b0').stroke({ width: 1, color: '#c59a2f' })
      this.furniture.addChild(plaque, t)
    }
    this.visitPoint = { x: dw / 2 + VISIT_OFFSET, y: 6 }
    this.hitArea = head ? new Rectangle(-90, -66, 180, 146) : new Rectangle(-62, -66, 124, 118)
    const rw = head ? 98 : 68
    this.ring.clear().roundRect(-rw, -72, rw * 2, head ? 160 : 130, 14).fill({ color: '#1d4ed8', alpha: 0.08 }).stroke({ width: 3, color: '#1d4ed8' })
  }

  /** Màn hình theo trạng thái agent: đang làm = sáng nhấp nháy; ghế trống = chế độ chờ. */
  setWorking(v: boolean) {
    if (v === this.working) return
    this.working = v
    this.drawScreens()
  }

  /** Người ngồi rời ghế thì màn hình chuyển sang chế độ chờ. */
  setSeatEmpty(v: boolean) {
    if (v === this.seatEmpty) return
    this.seatEmpty = v
    this.drawScreens()
  }

  private drawScreens() {
    this.screens.clear()
    this.screens.alpha = 1
    const color = this.seatEmpty ? SCREEN_STANDBY : this.working ? SCREEN_ON : SCREEN_OFF
    for (const r of this.screenRects) {
      this.screens.roundRect(r.x, r.y, 34, 20, 2).fill(color)
      if (this.seatEmpty) this.screens.circle(r.x + 17, r.y + 10, 2).fill('#475569') // chấm chờ
    }
  }

  /** Mỗi frame: màn hình nhấp nháy khi đang làm và có người ngồi. */
  animate(now: number) {
    if (this.working && !this.seatEmpty) this.screens.alpha = 0.8 + 0.2 * Math.sin((now + this.phase) / 220)
  }

  setHighlight(hovered: boolean, selected: boolean) {
    this.ring.visible = hovered || selected
    this.ring.alpha = selected ? 1 : 0.6
  }
}
