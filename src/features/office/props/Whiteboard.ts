import { Container, Graphics } from 'pixi.js'
import { softShadow, type Prop } from './types'

/** Bảng trắng treo tường, vẽ sơ đồ hệ thống: Frontend -> API -> DB. */
export function whiteboard(): Prop {
  const W = 170, H = 104
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 8)
  g.roundRect(0, 0, W, H, 8).fill('#cbd5e1').stroke({ width: 1, color: '#94a3b8' })
  g.roundRect(6, 6, W - 12, H - 24, 4).fill('#ffffff')
  g.roundRect(28, H - 14, W - 56, 7, 3).fill('#94a3b8') // khay bút
  g.roundRect(40, H - 17, 14, 4, 2).fill('#ef4444').roundRect(58, H - 17, 14, 4, 2).fill('#2563eb')
  // sơ đồ: 3 khối nối nhau + cơ sở dữ liệu bên dưới
  const box = (x: number, y: number, color: string) => g.roundRect(x, y, 36, 20, 4).stroke({ width: 2, color })
  box(16, 16, '#2563eb'); box(67, 16, '#7c3aed'); box(118, 16, '#0d9488')
  for (const x of [52, 103]) g.moveTo(x, 26).lineTo(x + 15, 26).stroke({ width: 2, color: '#64748b' })
  g.moveTo(85, 36).lineTo(85, 50).stroke({ width: 2, color: '#64748b' })
  g.ellipse(85, 58, 18, 7).stroke({ width: 2, color: '#ea580c' })
  g.moveTo(67, 58).lineTo(67, 68).moveTo(103, 58).lineTo(103, 68).stroke({ width: 2, color: '#ea580c' })
  g.ellipse(85, 68, 18, 7).stroke({ width: 2, color: '#ea580c' })
  const view = new Container()
  view.addChild(g)
  return { view, width: W, height: H }
}
