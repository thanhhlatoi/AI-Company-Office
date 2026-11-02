import { Container, Graphics } from 'pixi.js'
import { decoText, softShadow, type Prop } from './types'

/** Tủ hồ sơ 3 ngăn. */
export function filingCabinet(): Prop {
  const W = 72, H = 122
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 6)
  g.roundRect(0, 0, W, H, 6).fill('#94a3b8').stroke({ width: 2, color: '#64748b' })
  for (let i = 0; i < 3; i++) {
    const y = 8 + i * 37
    g.roundRect(7, y, W - 14, 32, 3).fill('#cbd5e1').stroke({ width: 1, color: '#64748b' })
    g.roundRect(24, y + 6, 24, 8, 2).fill('#ffffff').roundRect(26, y + 18, 20, 5, 2).fill('#475569') // nhãn + tay nắm
  }
  const view = new Container()
  view.addChild(g)
  return { view, width: W, height: H }
}

/** Két sắt có màn hình số dư; số đổi sau mỗi ~2.4 giây. */
export function safe(): Prop {
  const W = 92, H = 112
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 8)
  g.roundRect(0, 0, W, H, 8).fill('#334155').stroke({ width: 3, color: '#1e293b' })
  g.roundRect(8, 8, W - 16, H - 16, 5).fill('#475569')
  g.roundRect(14, 14, W - 28, 24, 4).fill('#052e16')
  g.circle(W / 2, 74, 20).fill('#94a3b8').stroke({ width: 3, color: '#cbd5e1' }).circle(W / 2, 74, 6).fill('#334155')
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.moveTo(W / 2 + Math.cos(a) * 14, 74 + Math.sin(a) * 14).lineTo(W / 2 + Math.cos(a) * 18, 74 + Math.sin(a) * 18).stroke({ width: 1.5, color: '#334155' }) }
  g.roundRect(W - 22, 66, 6, 22, 3).fill('#e2e8f0')
  const display = decoText('', 12, '#4ade80', '600')
  display.anchor.set(0.5)
  display.position.set(W / 2, 26)
  let tick = -1
  const show = (n: number) => { display.text = `$${(12000 + ((n * 7919) % 3500)).toLocaleString('en-US')}` }
  show(0)
  const view = new Container()
  view.addChild(g, display)
  return { view, width: W, height: H, animate: (now) => { const t = Math.floor(now / 2400); if (t !== tick) { tick = t; show(t) } } }
}

/** Máy tính tiền trên quầy. */
export function cashRegister(): Prop {
  const W = 96, H = 70
  const g = new Graphics()
  softShadow(g, 0, 28, W, 40, 6)
  g.roundRect(0, 32, W, 36, 6).fill('#b45309').roundRect(0, 32, W, 8, 6).fill('#d97706')
  g.roundRect(18, 6, 60, 34, 5).fill('#475569').roundRect(24, 11, 48, 12, 2).fill('#052e16')
  for (let i = 0; i < 8; i++) g.circle(28 + (i % 4) * 14, 29 + Math.floor(i / 4) * 5, 2).fill('#e2e8f0')
  g.roundRect(20, 42, 56, 9, 2).fill('#334155')
  const view = new Container()
  view.addChild(g)
  return { view, width: W, height: H }
}

/** Biểu đồ cột + đường treo tường. */
export function chartWall(): Prop {
  const W = 150, H = 92
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 6)
  g.roundRect(0, 0, W, H, 6).fill('#ffffff').stroke({ width: 2, color: '#86efac' })
  const bars = [0.3, 0.45, 0.4, 0.6, 0.75, 0.9]
  bars.forEach((v, i) => g.roundRect(14 + i * 21, H - 14 - v * 62, 14, v * 62, 2).fill(i === 5 ? '#15803d' : '#86efac'))
  g.poly(bars.flatMap((v, i) => [21 + i * 21, H - 20 - v * 66]), false).stroke({ width: 2.5, color: '#f59e0b' })
  const view = new Container()
  view.addChild(g)
  return { view, width: W, height: H }
}
