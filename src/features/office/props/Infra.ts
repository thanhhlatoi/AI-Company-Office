import { Container, Graphics } from 'pixi.js'
import { softShadow, type Prop } from './types'

/** Bảng sơ đồ mạng treo tường: Internet -> Router -> thiết bị; một nút nhấp nháy. */
export function networkBoard(): Prop {
  const W = 160, H = 96
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 8)
  g.roundRect(0, 0, W, H, 8).fill('#334155').stroke({ width: 2, color: '#0f172a' })
  g.roundRect(6, 6, W - 12, H - 12, 5).fill('#0f172a')
  const nodes: [number, number][] = [[80, 20], [80, 46], [28, 76], [66, 76], [104, 76], [138, 76]]
  const link = (a: number, b: number) => g.moveTo(...nodes[a]).lineTo(...nodes[b])
  link(0, 1); [2, 3, 4, 5].forEach((i) => link(1, i))
  g.stroke({ width: 1.5, color: '#0e7490' })
  nodes.forEach(([x, y], i) => g.circle(x, y, i < 2 ? 6 : 5).fill(i === 0 ? '#38bdf8' : '#22d3ee'))
  const pulse = new Graphics().circle(...nodes[1], 9).stroke({ width: 2, color: '#67e8f9' })
  const view = new Container()
  view.addChild(g, pulse)
  return { view, width: W, height: H, animate: (now) => { pulse.alpha = 0.5 + 0.5 * Math.sin(now / 500) } }
}

/** Bộ lưu điện UPS: quạt quay, thanh pin. */
export function ups(): Prop {
  const W = 76, H = 90
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 8)
  g.roundRect(0, 0, W, H, 8).fill('#475569').stroke({ width: 2, color: '#1e293b' })
  g.roundRect(8, 8, W - 16, 14, 3).fill('#0f172a')
  for (let i = 0; i < 4; i++) g.rect(12 + i * 13, 11, 9, 8).fill(i < 3 ? '#22c55e' : '#f59e0b') // thanh pin
  g.circle(W / 2, 56, 22).fill('#1e293b')
  const blades = new Container()
  for (let i = 0; i < 4; i++) {
    const b = new Graphics().ellipse(0, -9, 4.5, 9).fill('#94a3b8')
    b.rotation = (i * Math.PI) / 2
    blades.addChild(b)
  }
  blades.position.set(W / 2, 56)
  const hub = new Graphics().circle(W / 2, 56, 3.5).fill('#0f172a')
  const view = new Container()
  view.addChild(g, blades, hub)
  return { view, width: W, height: H, animate: (now) => { blades.rotation = now / 90 } }
}

/** Đồng hồ nhiệt độ phòng máy: kim dao động nhẹ quanh vùng an toàn. */
export function tempGauge(): Prop {
  const S = 84, C = S / 2
  const g = new Graphics()
  softShadow(g, 0, 0, S, S, 42)
  g.circle(C, C, C).fill('#e2e8f0').stroke({ width: 3, color: '#475569' })
  g.circle(C, C, C - 6).fill('#ffffff')
  g.arc(C, C, C - 11, Math.PI * 0.75, Math.PI * 1.5).stroke({ width: 5, color: '#22c55e' })
  g.arc(C, C, C - 11, Math.PI * 1.5, Math.PI * 1.9).stroke({ width: 5, color: '#f59e0b' })
  g.arc(C, C, C - 11, Math.PI * 1.9, Math.PI * 2.25).stroke({ width: 5, color: '#ef4444' })
  const needle = new Graphics().moveTo(0, 0).lineTo(0, -(C - 14)).stroke({ width: 2.5, color: '#0f172a' })
  needle.position.set(C, C)
  const view = new Container()
  view.addChild(g, needle, new Graphics().circle(C, C, 4).fill('#0f172a'))
  const rest = -0.9 // góc kim trong vùng xanh
  needle.rotation = rest
  return { view, width: S, height: S, animate: (now) => { needle.rotation = rest + Math.sin(now / 1500) * 0.12 } }
}
