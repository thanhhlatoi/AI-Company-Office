import { Container, Graphics } from 'pixi.js'
import { decoText, softShadow, type Prop } from './types'

/** Quầy cà phê: máy pha, cốc, bình nước. Điểm đứng pha cà phê nằm ngay phía dưới. */
export function coffeeMachine(): Prop {
  const W = 84, H = 100
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 8)
  g.roundRect(0, 38, W, 62, 8).fill('#a16207').roundRect(0, 38, W, 10, 8).fill('#ca8a04') // quầy
  g.roundRect(14, 6, 44, 42, 6).fill('#475569').roundRect(20, 12, 32, 14, 3).fill('#0f172a') // máy
  g.roundRect(28, 30, 16, 12, 2).fill('#e2e8f0').rect(32, 26, 8, 4).fill('#94a3b8') // cốc dưới vòi
  g.circle(68, 28, 9).fill('#93c5fd').stroke({ width: 2, color: '#3b82f6' }) // bình nước
  g.circle(24, 56, 5).fill('#ffffff').circle(38, 56, 5).fill('#fef3c7')
  const view = new Container()
  view.addChild(g)
  return { view, width: W, height: H }
}

/** Góc "Chờ duyệt": bảng có dấu chấm than, dải rào chắn; agent chờ chủ duyệt đứng phía trước. */
export function approvalCorner(): Prop {
  const W = 130, H = 104
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 8)
  g.roundRect(0, 0, W, H, 8).fill('#fffbeb').stroke({ width: 3, color: '#f59e0b' })
  g.roundRect(0, 0, W, 28, 8).fill('#f59e0b').rect(0, 20, W, 8).fill('#f59e0b')
  g.circle(W / 2, 62, 20).fill('#f59e0b').rect(W / 2 - 3, 50, 6, 16).fill('#ffffff').circle(W / 2, 74, 3.5).fill('#ffffff') // dấu chấm than
  g.rect(10, H - 10, 22, 6).fill('#dc2626').rect(W - 32, H - 10, 22, 6).fill('#dc2626')
  const t = decoText('CHỜ DUYỆT', 12, '#ffffff')
  t.anchor.set(0.5)
  t.position.set(W / 2, 14)
  const view = new Container()
  view.addChild(g, t)
  return { view, width: W, height: H }
}
