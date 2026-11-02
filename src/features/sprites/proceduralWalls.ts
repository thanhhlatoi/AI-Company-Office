import { Graphics } from 'pixi.js'
import { TILE } from './config.ts'

const CAP = 0xf7f7f7 // xám sáng để tint theo màu tường (nhân màu)
const FACE = 0xcbd5e1
const LINE = 0x94a3b8
// Hình học 3/4: mặt trên (cap) bị nâng lên h px so với nền; mặt đứng hướng nam (về camera) nằm ngay dưới cap.
// Ô tường dày 12px nằm giữa ô: cap y 10..22. Cánh BẮC do ô phía bắc vẽ (cánh nam của nó), nên không vẽ ở đây.
const T0 = 10, T1 = 22

const cap = (g: Graphics, x: number, y: number, w: number, h: number) => g.rect(x, y, w, h).fill(CAP).stroke({ width: 1, color: LINE, alpha: 0.6 })
const face = (g: Graphics, x: number, w: number, h: number) => g.rect(x, T1, w, h).fill(FACE)

/** Mảnh tường theo mặt nạ 4 hướng (N=1 E=2 S=4 W=8); h = chiều cao mặt đứng. Texture cao TILE + h, đáy = đáy ô. */
export function drawWall(mask: number, h: number): Graphics {
  const g = new Graphics()
  const [e, s, w] = [mask & 2, mask & 4, mask & 8]
  if (!s) face(g, T0, T1 - T0, h)
  if (e) face(g, T1, TILE - T1, h)
  if (w) face(g, 0, T0, h)
  if (s) cap(g, T0, T1, T1 - T0, TILE + T0 - T1) // cánh nam: nối tới cap của ô phía nam (bắt đầu ở y = TILE + T0)
  cap(g, T0, T0, T1 - T0, T1 - T0)
  if (e) cap(g, T1, T0, TILE - T1, T1 - T0)
  if (w) cap(g, 0, T0, T0, T1 - T0)
  return g
}

/** Khung cửa: hai trụ + (tường cao) xà ngang. Cửa dọc (v) tường cao có xà bắc cầu hai đầu tường; tường thấp để trống. */
export function drawDoor(axis: 'h' | 'v', h: number, low: boolean): Graphics {
  const g = new Graphics()
  if (axis === 'h') {
    for (const x of [0, TILE - 8]) { face(g, x, 8, h); cap(g, x, T0, 8, T1 - T0) }
    if (!low) { face(g, 8, TILE - 16, 8); cap(g, 8, T0, TILE - 16, T1 - T0) }
  } else if (!low) {
    g.rect(T0, TILE + T0, T1 - T0, 8).fill(FACE)
    cap(g, T0, T0, T1 - T0, TILE)
  }
  return g
}
