import { Container, Graphics } from 'pixi.js'
import { decoText, quad, type Prop } from './types'

/** Đèn neon "LIVE": viền neon hồng nhiều lớp + chữ phát sáng, thỉnh thoảng chập chờn. */
export function neonSign(): Prop {
  const W = 150, H = 64
  const view = new Container()
  const glow = new Graphics()
  for (const [w, a] of [[14, 0.15], [8, 0.3], [3, 1]] as const) glow.roundRect(6, 6, W - 12, H - 12, 18).stroke({ width: w, color: '#f472b6', alpha: a })
  const text = decoText('LIVE', 26, '#fdf2f8')
  text.style.stroke = { color: '#ec4899', width: 5 }
  text.anchor.set(0.5)
  text.position.set(W / 2, H / 2)
  const back = new Graphics().roundRect(0, 0, W, H, 22).fill({ color: '#1e1b4b', alpha: 0.55 })
  view.addChild(back, glow, text)
  return { view, width: W, height: H, animate: (now) => { glow.alpha = text.alpha = Math.sin(now / 90) * Math.sin(now / 1300) > 0.93 ? 0.55 : 1 } }
}

/** Giá đỡ điện thoại ba chân đang quay dọc. */
export function phoneStand(): Prop {
  const W = 72, H = 132
  const g = new Graphics()
  g.ellipse(36, H - 4, 28, 5).fill({ color: '#0f172a', alpha: 0.1 })
  for (const x of [8, 36, 64]) g.moveTo(36, 84).lineTo(x, H - 6).stroke({ width: 3, color: '#475569' })
  g.rect(34, 60, 4, 26).fill('#64748b')
  g.roundRect(18, 4, 36, 62, 6).fill('#0f172a')
  g.roundRect(21, 9, 30, 50, 3).fill('#c026d3').roundRect(21, 34, 30, 25, 3).fill('#ec4899')
  g.circle(36, 18, 5).fill({ color: '#ffffff', alpha: 0.85 }).circle(33, 7, 1.5).fill('#475569')
  const view = new Container()
  view.addChild(g)
  return { view, width: W, height: H }
}

/** Tường dán poster: 4 poster nhiều màu, có băng dính. */
export function posterWall(): Prop {
  const S = 130
  const g = new Graphics()
  g.roundRect(0, 0, S, S, 8).fill('#f5e6ff').stroke({ width: 2, color: '#d8b4fe' })
  const posters = [['#6366f1', '#a5b4fc'], ['#ec4899', '#fbcfe8'], ['#14b8a6', '#99f6e4'], ['#f59e0b', '#fde68a']]
  posters.forEach(([a, b], i) => {
    const cx = 34 + (i % 2) * 62, cy = 34 + Math.floor(i / 2) * 62, ang = ((i * 5) % 7 - 3) * 0.025
    g.poly(quad(cx, cy, 50, 50, ang)).fill(a)
    g.circle(cx, cy - 4, 12).fill(b)
    g.poly(quad(cx, cy + 16, 36, 6, ang)).fill(b)
    g.poly(quad(cx, cy - 25, 14, 6, ang)).fill({ color: '#ffffff', alpha: 0.6 }) // băng dính
  })
  const view = new Container()
  view.addChild(g)
  return { view, width: S, height: S }
}
