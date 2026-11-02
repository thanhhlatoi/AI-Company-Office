import { Container, Graphics, Text } from 'pixi.js'
import { STATUS_STYLE } from '../../lib/statusColors'
import { DATACLASS_STYLE } from '../studio/risk'
import type { AgentStatus } from '../../types'

const FONT = 'Inter, sans-serif'
const txt = (size: number, weight: '400' | '600' | '700', fill: string) =>
  // resolution cao để chữ vẫn nét khi zoom 2x; cỡ chữ tối thiểu 12px
  new Text({ text: '', resolution: 3, style: { fontFamily: FONT, fontSize: size, fontWeight: weight, fill } })

/** Nhãn 2 dòng: [vòng chữ cái đầu] Tên Vai trò / pill trạng thái. Gốc (0,0) = giữa cạnh trên. */
export class Nameplate extends Container {
  static readonly HEIGHT = 46
  private disc = new Graphics()
  private initial = txt(12, '700', '#ffffff')
  private nameText = txt(13, '700', '#0f172a')
  private roleText = txt(12, '400', '#64748b')
  private pill = new Graphics()
  private pillText = txt(12, '600', '#000000')
  // huy hiệu LOCAL / CLOUD của model đang dùng, nằm bên phải vai trò
  private tag = new Graphics()
  private tagText = txt(12, '700', '#000000')
  // Trưởng phòng: khung viền màu phòng + huy hiệu sao
  private frame = new Graphics()
  private star = new Graphics()
  private accent: string | null = null
  private x0 = 0
  private total = 0

  constructor() {
    super()
    this.initial.anchor.set(0.5)
    this.nameText.anchor.set(0, 0.5)
    this.roleText.anchor.set(0, 0.5)
    this.pillText.anchor.set(0.5)
    this.pillText.y = 36
    this.tagText.anchor.set(0, 0.5)
    this.addChild(this.frame, this.star, this.disc, this.initial, this.nameText, this.roleText, this.tag, this.tagText, this.pill, this.pillText)
  }

  setIdentity(name: string, role: string, color: string, model: 'LOCAL' | 'CLOUD' | null = null) {
    this.initial.text = name.charAt(0).toUpperCase()
    this.nameText.text = name
    this.roleText.text = role
    const st = model ? DATACLASS_STYLE[model] : null
    this.tagText.text = st?.label ?? ''
    const tagW = st ? this.tagText.width + 12 : 0
    const total = 22 + 6 + this.nameText.width + 6 + this.roleText.width + (st ? 6 + tagW : 0)
    const x0 = -total / 2
    this.x0 = x0
    this.total = total
    this.disc.clear().circle(x0 + 11, 11, 11).fill(color)
    this.initial.position.set(x0 + 11, 11)
    this.nameText.position.set(x0 + 28, 11)
    this.roleText.position.set(x0 + 28 + this.nameText.width + 6, 12)
    const tx = x0 + 28 + this.nameText.width + 6 + this.roleText.width + 6
    this.tag.clear()
    if (st) this.tag.roundRect(tx, 2, tagW, 18, 9).fill(st.soft).stroke({ width: 1, color: st.color })
    this.tagText.style.fill = st?.color ?? '#000000'
    this.tagText.position.set(tx + 6, 11)
    this.drawHead()
  }

  /** Bật/tắt dấu hiệu trưởng phòng (accent = màu phòng, null = nhân viên thường). */
  setHead(accent: string | null) {
    this.accent = accent
    this.drawHead()
  }

  private drawHead() {
    this.frame.clear()
    this.star.clear()
    if (!this.accent) return
    const left = this.x0 - 26
    const w = this.total + 26 + 12
    this.frame.roundRect(left, -6, w, Nameplate.HEIGHT + 12, 12).fill({ color: '#ffffff', alpha: 0.92 }).stroke({ width: 2, color: this.accent })
    this.star.star(this.x0 - 13, 11, 5, 8, 3.6).fill('#f59e0b').stroke({ width: 1, color: '#b45309' })
  }

  setStatus(status: AgentStatus, text: string) {
    const s = STATUS_STYLE[status]
    this.pillText.text = text
    this.pillText.style.fill = s.color
    const w = this.pillText.width + 20
    this.pill.clear().roundRect(-w / 2, 26, w, 20, 10).fill(s.soft).stroke({ width: 1, color: s.color })
  }
}
