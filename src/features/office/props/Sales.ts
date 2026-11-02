import { Container, Graphics } from 'pixi.js'
import { softShadow, type Prop } from './types'

/** Biểu đồ tăng trưởng: cột tăng dần + mũi tên đi lên. */
export function growthChart(): Prop {
  const W = 150, H = 100
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 6)
  g.roundRect(0, 0, W, H, 6).fill('#ffffff').stroke({ width: 2, color: '#fdba74' })
  ;[0.25, 0.4, 0.55, 0.7, 0.9].forEach((v, i) => g.roundRect(14 + i * 24, H - 12 - v * 64, 16, v * 64, 2).fill(i === 4 ? '#b8530a' : '#fed7aa'))
  g.moveTo(16, 70).lineTo(52, 56).lineTo(80, 60).lineTo(130, 20).stroke({ width: 4, color: '#16a34a', cap: 'round', join: 'round' })
  g.poly([140, 12, 120, 14, 134, 30]).fill('#16a34a')
  const view = new Container()
  view.addChild(g)
  return { view, width: W, height: H }
}

const ROUTE = [[18, 78], [50, 58], [80, 70], [112, 42], [132, 26]]
const SEGMENTS = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]))
const ROUTE_LEN = SEGMENTS.reduce((a, b) => a + b, 0)

/** Điểm nằm cách đầu tuyến `d` đơn vị (đi dọc các đoạn thẳng). */
function pointAlong(d: number): [number, number] {
  let left = d
  for (let i = 0; i < SEGMENTS.length; i++) {
    if (left <= SEGMENTS[i]) { const t = left / SEGMENTS[i]; return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * t, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * t] }
    left -= SEGMENTS[i]
  }
  return [ROUTE[ROUTE.length - 1][0], ROUTE[ROUTE.length - 1][1]]
}

/** Bản đồ giao hàng: tuyến đường có chấm xe chạy. */
export function deliveryMap(): Prop {
  const W = 150, H = 100
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 6)
  g.roundRect(0, 0, W, H, 6).fill('#ecfccb').stroke({ width: 2, color: '#a3a3a3' })
  g.roundRect(10, 10, 40, 24, 3).fill('#bbf7d0').roundRect(92, 56, 44, 30, 3).fill('#bae6fd').roundRect(60, 14, 26, 18, 3).fill('#fde68a')
  g.moveTo(0, 50).lineTo(W, 50).moveTo(70, 0).lineTo(70, H).stroke({ width: 5, color: '#ffffff' })
  g.poly(ROUTE.flat(), false).stroke({ width: 3, color: '#ea580c', alpha: 0.85, join: 'round' })
  g.circle(18, 78, 5).fill('#16a34a').circle(132, 26, 5).fill('#dc2626')
  const truck = new Graphics().circle(0, 0, 4.5).fill('#1d4ed8').stroke({ width: 2, color: '#ffffff' })
  const view = new Container()
  view.addChild(g, truck)
  return { view, width: W, height: H, animate: (now) => { truck.position.set(...pointAlong(((now / 40) % (ROUTE_LEN * 1.15)) % ROUTE_LEN)) } }
}
