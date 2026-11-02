import { Graphics } from 'pixi.js'
import { ANIM_TABLE, FRAME_H, FRAME_W, type DrawnDir } from './config.ts'

type XY = [number, number]
interface Pose { sit: boolean; head: XY; handL: XY; handR: XY; footL: XY; footR: XY; eyesClosed?: boolean }
export type CharPart = 'body' | 'outfit' | 'hair'

const CX = FRAME_W / 2
const W = 0xffffff // vẽ trắng để tint (da/tóc/áo) nhân lên đúng màu
const EYE = 0x1e293b

/** Tư thế từng khung của người que. Toạ độ trong khung 32x48, chân ở đáy. */
function poseOf(anim: string, i: number, dir: DrawnDir): Pose {
  const side = dir === 'right'
  const a = i % 2 ? 1 : -1
  const stand: Pose = { sit: false, head: [CX, 12], handL: [CX - (side ? 2 : 8), 32], handR: [CX + (side ? 2 : 8), 32], footL: [CX - 4, FRAME_H - 2], footR: [CX + 4, FRAME_H - 2] }
  const sit: Pose = { sit: true, head: [CX, 22], handL: [CX - 6, 40], handR: [CX + 6, 40], footL: [CX - 5, FRAME_H - 2], footR: [CX + 5, FRAME_H - 2] }
  switch (anim) {
    case 'sit_idle': return { ...sit, head: [CX, 22 + (i % 2)] }
    case 'sit_type': return { ...sit, handL: [CX - 6, 39 + (i % 2) * 2], handR: [CX + 6, 39 + ((i + 1) % 2) * 2] }
    case 'sit_hand': return { ...sit, handR: [CX + 9 + a * 2, 12] } // giơ tay vẫy
    case 'sit_sleep': return { ...sit, head: [CX, 26 + (i % 2)], eyesClosed: true }
    case 'sit_error': return { ...sit, head: [CX + a, 22], handL: [CX - 9, 20], handR: [CX + 9, 20] } // ôm đầu
    case 'sit_think': return { ...sit, head: [CX + a, 22], handR: [CX + 4, 28] } // tay chống cằm
    case 'walk': {
      const s = Math.sin((i / ANIM_TABLE.walk.frames) * Math.PI * 2) * 4
      const bob = Math.abs(s) > 3 ? 0 : -1
      const lat = side ? [s, 0] : [0, s * 0.5] // đi ngang: chân vung theo x; đi dọc: lệch y
      return { ...stand, head: [CX, 12 + bob], handL: [CX - (side ? 0 : 8) - lat[0], 32 - lat[1]], handR: [CX + (side ? 0 : 8) + lat[0], 32 + lat[1]], footL: [CX - (side ? 0 : 4) + lat[0], FRAME_H - 2 - lat[1]], footR: [CX + (side ? 0 : 4) - lat[0], FRAME_H - 2 + lat[1]] }
    }
    case 'talk': return { ...stand, handR: [CX + 10, 26 + a * 3] }
    case 'drink': return { ...stand, handR: [CX + 3, i % 2 ? 14 : 20] }
    default: return stand
  }
}

/** Vẽ MỘT lớp (body = đầu+tay+mắt, outfit = thân+tay áo+chân, hair = tóc) của người que. */
export function drawCharPart(part: CharPart, anim: string, dir: DrawnDir, i: number): Graphics {
  const p = poseOf(anim, i, dir)
  const g = new Graphics()
  const shoulderY = p.sit ? 31 : 22
  const hipY = p.sit ? 41 : 33
  const [hx, hy] = p.head
  if (part === 'outfit') {
    const t = dir === 'right' ? 4 : 7
    g.roundRect(CX - t, shoulderY, t * 2, hipY - shoulderY, 3).fill(W) // thân
    for (const h of [p.handL, p.handR]) g.moveTo(CX + (h[0] < CX ? -t + 1 : t - 1), shoulderY + 2).lineTo(h[0], h[1]).stroke({ width: 3, color: W, cap: 'round' })
    for (const f of [p.footL, p.footR]) g.moveTo(CX + (f[0] < CX ? -2 : 2), hipY).lineTo(f[0], p.sit ? hipY + 4 : (hipY + f[1]) / 2).lineTo(f[0], f[1]).stroke({ width: 3, color: W, cap: 'round', join: 'round' })
  } else if (part === 'body') {
    g.circle(hx, hy, 7).fill(W)
    for (const h of [p.handL, p.handR]) g.circle(h[0], h[1], 2.5).fill(W)
    if (dir !== 'up') {
      const ex = dir === 'right' ? [hx + 3] : [hx - 3, hx + 3]
      for (const x of ex) {
        if (p.eyesClosed) g.moveTo(x - 1.5, hy + 1).lineTo(x + 1.5, hy + 1).stroke({ width: 1, color: EYE })
        else g.circle(x, hy + 1, 1.2).fill(EYE)
      }
    }
  } else {
    const front = dir === 'up' ? 7.2 : 5 // nhìn từ sau: tóc phủ cả đầu
    g.arc(hx, hy, 7.4, Math.PI, 0).lineTo(hx + 7.4, hy - 1).lineTo(hx - 7.4, hy - 1).fill(W)
    if (dir === 'up') g.circle(hx, hy, front).fill(W)
  }
  return g
}
