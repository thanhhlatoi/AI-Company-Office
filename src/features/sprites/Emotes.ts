import { Container, Graphics, Text } from 'pixi.js'
import type { Icon } from './resolvePose.ts'

const glyph = (g: Graphics, fill: string, stroke: string) => g.circle(0, 0, 10).fill(fill).stroke({ width: 2, color: stroke })

/** Biểu tượng cạnh đầu: ! (chờ duyệt), đồng xu (chờ ngân sách), X đỏ (lỗi), Zzz (offline). Luôn kèm chữ ở nhãn trạng thái. */
export function makeEmote(kind: Exclude<Icon, 'none'>): Container {
  const c = new Container()
  if (kind === 'zzz') {
    const t = new Text({ text: 'Zzz', resolution: 3, style: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: '700', fill: '#64748b' } })
    t.anchor.set(0.5)
    c.addChild(t)
    return c
  }
  const g = new Graphics()
  if (kind === 'alert') glyph(g, '#f59e0b', '#ffffff').roundRect(-1.6, -6, 3.2, 7, 1.4).fill('#ffffff').circle(0, 4.5, 1.8).fill('#ffffff')
  else if (kind === 'coin') glyph(g, '#facc15', '#a16207').circle(0, 0, 5.5).stroke({ width: 1.5, color: '#a16207' }).moveTo(0, -3).lineTo(0, 3).stroke({ width: 1.5, color: '#a16207' })
  else glyph(g, '#dc2626', '#ffffff').moveTo(-4, -4).lineTo(4, 4).moveTo(4, -4).lineTo(-4, 4).stroke({ width: 2.2, color: '#ffffff', cap: 'round' })
  c.addChild(g)
  return c
}
