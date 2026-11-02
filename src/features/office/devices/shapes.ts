import type { Graphics } from 'pixi.js'
import type { DeviceType } from '../../../types'

// Hình từng loại thiết bị, vẽ vào Graphics. Gốc (0,0) = giữa đáy; thân vươn lên phía y âm. Rộng <= 104, cao <= 96 (khớp DEVICE_FOOT).
export interface Shape {
  h: number
  /** vị trí đèn trạng thái chính */
  led: [number, number]
  /** đèn hoạt động phụ (nhấp nháy khi máy chạy) */
  blinkers: [number, number][]
  /** quạt (chỉ máy AI) */
  fan?: { x: number; y: number; r: number }
}

const DARK = '#1e293b'
const MID = '#334155'
const LIGHT = '#94a3b8'

const SHAPES: Record<DeviceType, (g: Graphics) => Shape> = {
  WORKSTATION(g) {
    g.roundRect(-50, -66, 28, 66, 4).fill(MID).stroke({ width: 2, color: DARK }) // tháp
    g.rect(-44, -52, 16, 3).fill(LIGHT).rect(-44, -46, 16, 3).fill(LIGHT)
    g.roundRect(-14, -70, 64, 44, 4).fill(DARK) // màn hình
    g.rect(-9, -65, 54, 34).fill('#0ea5e9')
    g.rect(14, -26, 8, 14).fill(LIGHT).roundRect(4, -14, 28, 6, 3).fill(LIGHT) // chân đế
    return { h: 70, led: [-36, -58], blinkers: [] }
  },
  AI_PC(g) {
    g.roundRect(-32, -94, 64, 94, 6).fill(DARK).stroke({ width: 2, color: '#0f172a' })
    g.roundRect(-26, -86, 52, 56, 4).fill('#0f172a').stroke({ width: 1.5, color: '#0e7490' }) // kính hông
    g.circle(0, -58, 22).fill('#111827').stroke({ width: 1.5, color: '#475569' })
    g.rect(-26, -22, 52, 4).fill('#a855f7').rect(-26, -14, 52, 4).fill('#22d3ee') // dải RGB
    return { h: 94, led: [20, -92], blinkers: [], fan: { x: 0, y: -58, r: 20 } }
  },
  LAPTOP(g) {
    g.roundRect(-38, -62, 76, 50, 4).fill(DARK).stroke({ width: 2, color: '#0f172a' })
    g.rect(-33, -57, 66, 40).fill('#3b0764')
    g.circle(0, -37, 9).fill('#f97316') // dấu Ubuntu
    g.poly([-48, 0, 48, 0, 40, -12, -40, -12]).fill(LIGHT).stroke({ width: 2, color: '#64748b' })
    return { h: 62, led: [34, -6], blinkers: [] }
  },
  SERVER(g) {
    const blinkers: [number, number][] = []
    for (const y of [-72, -36]) { // hai khay rack 2U chồng nhau
      g.roundRect(-52, y, 104, 34, 3).fill(MID).stroke({ width: 2, color: DARK })
      for (let i = 0; i < 5; i++) g.rect(-44 + i * 12, y + 8, 9, 18).fill(DARK) // khay đĩa
      g.rect(18, y + 9, 24, 2).fill(LIGHT).rect(18, y + 14, 24, 2).fill(LIGHT).rect(18, y + 19, 24, 2).fill(LIGHT)
      blinkers.push([-40 + 0, y + 4], [-28, y + 4], [-16, y + 4])
    }
    return { h: 72, led: [42, -64], blinkers }
  },
  ROUTER(g) {
    for (const x of [-34, 0, 34]) g.moveTo(x, -20).lineTo(x + (x ? x / 6 : 0), -62).stroke({ width: 4, color: DARK }).circle(x + (x ? x / 6 : 0), -62, 4).fill('#0e7490') // ăng-ten
    g.roundRect(-48, -20, 96, 20, 5).fill(MID).stroke({ width: 2, color: DARK })
    const blinkers: [number, number][] = []
    for (let i = 0; i < 5; i++) { g.rect(-40 + i * 11, -14, 8, 8).fill(DARK); blinkers.push([-36 + i * 11, -17]) } // cổng LAN
    return { h: 66, led: [38, -10], blinkers }
  },
  NAS(g) {
    g.roundRect(-38, -80, 76, 80, 6).fill(MID).stroke({ width: 2, color: DARK })
    const blinkers: [number, number][] = []
    for (let i = 0; i < 4; i++) { // 4 khay ổ đĩa
      const y = -74 + i * 17
      g.roundRect(-32, y, 56, 13, 2).fill(DARK).rect(-27, y + 5, 30, 3).fill(LIGHT)
      blinkers.push([30, y + 6.5])
    }
    return { h: 80, led: [30, -8], blinkers }
  },
}

export function drawShape(type: DeviceType, g: Graphics): Shape {
  g.ellipse(0, 2, 56, 8).fill({ color: '#0f172a', alpha: 0.12 }) // bóng
  return SHAPES[type](g)
}
