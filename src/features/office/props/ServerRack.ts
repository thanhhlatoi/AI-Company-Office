import { Container, Graphics } from 'pixi.js'
import { softShadow, type Prop } from './types'

const UNITS = 5
const LED_COLORS = ['#22c55e', '#38bdf8', '#f59e0b']

/** Tủ server nhỏ: đèn LED chớp lệch pha. */
export function serverRack(): Prop {
  const W = 72, H = 134
  const view = new Container()
  const body = new Graphics()
  softShadow(body, 0, 0, W, H, 8)
  body.roundRect(0, 0, W, H, 8).fill('#1e293b').stroke({ width: 2, color: '#0f172a' })
  const leds: Graphics[] = []
  for (let u = 0; u < UNITS; u++) {
    const y = 9 + u * 24
    body.roundRect(7, y, W - 14, 19, 3).fill('#334155')
    body.rect(30, y + 7, 28, 2).fill('#475569').rect(30, y + 11, 28, 2).fill('#475569') // khe tản nhiệt
    LED_COLORS.forEach((c, i) => {
      const led = new Graphics().circle(0, 0, 2.4).fill(c)
      led.position.set(15 + i * 6.5 - 3, y + 9.5)
      leds.push(led)
    })
  }
  view.addChild(body, ...leds)
  return {
    view, width: W, height: H,
    // mỗi LED bật/tắt theo hai sóng sin khác chu kỳ -> trông như nhấp nháy ngẫu nhiên
    animate: (now) => leds.forEach((led, i) => { led.alpha = Math.sin(now / (260 + i * 37)) * Math.sin(now / (410 + i * 53)) > -0.1 ? 1 : 0.25 }),
  }
}
