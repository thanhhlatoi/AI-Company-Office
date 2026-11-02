import { Graphics } from 'pixi.js'
import { PALETTES } from '../../styles/tokens.ts'
import { STATUS_STYLE } from '../../lib/statusColors.ts'
import { TILE, type FloorPattern } from './config.ts'
import type { CatalogItem } from './catalog.ts'

const WOOD = '#c9a36b'
const WOOD_DARK = '#8a6a3c'
const METAL = '#94a3b8'
const SCREEN_OFF = '#334155'
const INK = '#1e293b'

/** Vẽ một khung của đồ vật; (0,0) = góc trên-trái của hình, đáy = heightPx. */
export function drawProp(item: CatalogItem, state: string, frame: number): Graphics {
  const w = item.w * TILE
  const h = item.heightPx
  const g = new Graphics()
  switch (item.key) {
    case 'desk':
      g.roundRect(0, 6, w, h - 6, 8).fill(WOOD).stroke({ width: 2, color: WOOD_DARK })
      g.roundRect(6, h - 14, w - 12, 6, 3).fill({ color: WOOD_DARK, alpha: 0.25 }) // mép trước
      break
    case 'chair':
      g.roundRect(6, 0, w - 12, 22, 8).fill(PALETTES.steel.accent) // lưng ghế
      g.roundRect(4, 20, w - 8, h - 24, 8).fill(PALETTES.steel.wall).stroke({ width: 1.5, color: PALETTES.steel.accent })
      break
    case 'monitor': {
      const color = state === 'working' ? (frame ? '#7dd3fc' : '#38bdf8') : state === 'error' ? (frame ? '#fca5a5' : STATUS_STYLE.ERROR.color) : state === 'idle' ? '#0f172a' : SCREEN_OFF
      g.roundRect(3, 2, w - 6, 26, 3).fill(INK).roundRect(6, 5, w - 12, 20, 2).fill(color)
      g.rect(w / 2 - 2, 28, 4, 8).fill(METAL).roundRect(w / 2 - 8, 36, 16, 4, 2).fill(METAL)
      if (state === 'working') for (let r = 0; r < 3; r++) g.rect(9, 8 + r * 5, 8 + ((r + frame) % 2) * 6, 2).fill({ color: '#fff', alpha: 0.7 })
      break
    }
    case 'plant': {
      const sway = frame ? 1.5 : -1.5
      g.roundRect(9, h - 16, w - 18, 16, 3).fill('#b45309')
      for (const [dx, dy, r] of [[-6, 0, 8], [6, -4, 8], [0, -12, 9]]) g.circle(w / 2 + dx + sway * (dy / -12 + 0.3), h - 24 + dy, r).fill(PALETTES.green.accent)
      break
    }
    case 'coffee_machine':
      g.roundRect(6, 6, w - 12, h - 10, 4).fill(INK).rect(10, 12, w - 20, 8).fill(PALETTES.orange.accent)
      g.roundRect(12, h - 18, w - 24, 12, 2).fill('#f8fafc')
      if (state === 'active') g.moveTo(w / 2 - 3, 4).quadraticCurveTo(w / 2 - 7 + frame * 6, -4, w / 2, -10).stroke({ width: 2, color: '#cbd5e1' })
      break
    case 'server_rack':
      g.roundRect(4, 0, w - 8, h, 3).fill(INK)
      for (let r = 0; r < 5; r++) {
        g.rect(8, 6 + r * 11, w - 16, 8).fill('#334155')
        const on = state === 'busy' ? (r * 3 + frame) % 3 !== 0 : state === 'off' ? false : (r + frame) % 2 === 1 // busy: gần như sáng hết, chớp nhanh; mặc định: nhịp nhẹ
        const lit = state === 'alert' ? (r + frame) % 2 === 1 : on
        g.circle(w - 12, 10 + r * 11, 1.8).fill(lit ? (state === 'alert' ? STATUS_STYLE.ERROR.color : STATUS_STYLE.WORKING.color) : '#1f2937')
      }
      break
    case 'rug':
      g.roundRect(2, 2, w - 4, h - 4, 6).fill('#e2e8f0').stroke({ width: 2, color: '#94a3b8' }).roundRect(8, 8, w - 16, h - 16, 4).stroke({ width: 1, color: '#94a3b8', alpha: 0.7 })
      break
    case 'safe':
      g.roundRect(2, 4, w - 4, h - 6, 4).fill('#475569').stroke({ width: 2, color: '#1e293b' }).roundRect(7, 9, w - 14, h - 16, 3).stroke({ width: 1.5, color: '#94a3b8' }).circle(w / 2, h / 2 + 1, 4).fill('#cbd5e1')
      break
    case 'goal_board':
      g.roundRect(0, 0, w, h - 10, 4).fill('#0f172a').stroke({ width: 3, color: '#a16207' })
      break
    case 'whiteboard':
      g.roundRect(0, 0, w, h - 10, 4).fill('#f8fafc').stroke({ width: 3, color: METAL })
      for (let r = 0; r < 3; r++) g.rect(12, 14 + r * 12, w - 40 - r * 14, 2.5).fill('#94a3b8')
      break
    default:
      g.roundRect(0, 0, w, h, 4).fill('#cbd5e1').stroke({ width: 1, color: '#64748b' })
  }
  return g
}

/** Ô sàn 32x32 xám sáng để tint theo màu phòng (nhân màu). */
export function drawTile(pattern: FloorPattern | string): Graphics {
  const base = 0xf3f4f6
  const mark = 0xd1d5db
  const g = new Graphics().rect(0, 0, TILE, TILE).fill(base)
  switch (pattern) {
    case 'wood': for (let y = 0; y < TILE; y += 8) g.rect(0, y, TILE, 1).fill(mark).rect((y * 5) % TILE, y, 1, 8).fill(mark); break
    case 'carpet': for (let i = 0; i < 24; i++) g.rect((i * 13) % TILE, (i * 7) % TILE, 2, 2).fill(mark); break
    case 'tile': g.rect(0, 0, TILE, 1).fill(mark).rect(0, 0, 1, TILE).fill(mark); break
    case 'checker': g.rect(0, 0, 16, 16).fill(mark).rect(16, 16, 16, 16).fill(mark); break
    default: break
  }
  return g
}
