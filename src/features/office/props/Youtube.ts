import { Container, Graphics } from 'pixi.js'
import { quad, softShadow, type Prop } from './types'

/** Micro thu âm trên chân đứng, có lưới chống ồn. */
export function microphone(): Prop {
  const W = 60, H = 130
  const g = new Graphics()
  g.ellipse(30, H - 6, 24, 6).fill({ color: '#0f172a', alpha: 0.12 })
  g.ellipse(30, H - 10, 20, 6).fill('#1e293b').rect(28, 44, 4, H - 54).fill('#64748b')
  g.circle(30, 28, 20).fill({ color: '#ffffff', alpha: 0.35 }).stroke({ width: 2, color: '#475569' }) // lưới lọc gió
  g.roundRect(22, 12, 16, 32, 8).fill('#334155').roundRect(25, 15, 4, 20, 2).fill({ color: '#ffffff', alpha: 0.25 })
  const view = new Container()
  view.addChild(g)
  return { view, width: W, height: H }
}

/** Đèn vòng (ring light) trên chân ba chân; quầng sáng thở chậm. */
export function ringLight(): Prop {
  const W = 72, H = 140
  const view = new Container()
  const glow = new Graphics().circle(36, 36, 32).stroke({ width: 18, color: '#fde68a', alpha: 0.4 })
  const g = new Graphics()
  g.ellipse(36, H - 4, 28, 5).fill({ color: '#0f172a', alpha: 0.1 })
  for (const x of [8, 36, 64]) g.moveTo(36, 100).lineTo(x, H - 6).stroke({ width: 3, color: '#475569' })
  g.rect(34, 66, 4, 36).fill('#64748b')
  g.circle(36, 36, 28).stroke({ width: 8, color: '#fff7ed' }).circle(36, 36, 20).fill({ color: '#1e293b', alpha: 0.85 })
  g.roundRect(31, 30, 10, 14, 2).fill('#0f172a')
  view.addChild(glow, g)
  return { view, width: W, height: H, animate: (now) => { glow.alpha = 0.7 + 0.3 * Math.sin(now / 900) } }
}

/** Bảng ý tưởng: bảng lie dán giấy nhớ. */
export function ideaBoard(): Prop {
  const W = 150, H = 100
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 6)
  g.roundRect(0, 0, W, H, 6).fill('#a16207').roundRect(6, 6, W - 12, H - 12, 3).fill('#d6a869')
  const notes = ['#fde047', '#fda4af', '#86efac', '#93c5fd', '#fdba74', '#fde047', '#c4b5fd', '#86efac']
  notes.forEach((color, i) => {
    const cx = 24 + (i % 4) * 34, cy = 28 + Math.floor(i / 4) * 40
    g.poly(quad(cx, cy, 26, 26, ((i * 37) % 11 - 5) * 0.03)).fill(color)
    g.circle(cx, cy - 10, 2.2).fill('#dc2626')
  })
  g.moveTo(24, 18).lineTo(58, 18).lineTo(92, 58).stroke({ width: 1.5, color: '#dc2626', alpha: 0.8 })
  const view = new Container()
  view.addChild(g)
  return { view, width: W, height: H }
}

/** Màn hình dựng phim: các track clip và đầu phát chạy ngang. */
export function timelineScreen(): Prop {
  const W = 170, H = 104
  const g = new Graphics()
  softShadow(g, 0, 0, W, H, 8)
  g.roundRect(0, 0, W, H, 8).fill('#0f172a').roundRect(6, 6, W - 12, H - 12, 4).fill('#1e293b')
  g.roundRect(12, 12, 48, 30, 3).fill('#334155').poly([30, 20, 30, 34, 42, 27]).fill('#94a3b8') // khung xem trước
  const rows = [['#38bdf8', '#818cf8', '#38bdf8'], ['#f472b6', '#fb7185'], ['#4ade80', '#a3e635', '#4ade80']]
  rows.forEach((clips, r) => {
    let x = 12
    clips.forEach((color, i) => { const w = 30 + ((r * 3 + i) * 17) % 34; g.roundRect(x, 50 + r * 14, w, 10, 2).fill(color); x += w + 4 })
  })
  const head = new Graphics().rect(0, 0, 2, 50).fill('#ef4444').poly([-4, 0, 6, 0, 1, 7]).fill('#ef4444')
  head.position.set(12, 46)
  const view = new Container()
  view.addChild(g, head)
  return { view, width: W, height: H, animate: (now) => { head.x = 12 + ((now / 30) % (W - 28)) } }
}
