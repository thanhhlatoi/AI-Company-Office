import { Container, Graphics } from 'pixi.js'

const LIFE = 1800 // ms tồn tại tổng cộng
const TRAVEL = 1100 // ms một hạt sáng chạy hết đường
const FADE_AT = 1400
const PARTICLES = 3

/** Đường nối cong từ bàn trưởng phòng tới một nhân viên, kèm vài hạt sáng chạy dọc; tự tắt sau ~1.8s. */
export class DispatchEffect extends Container {
  private born: number
  private p0: [number, number]
  private p1: [number, number]
  private cp: [number, number]
  private particles: Graphics[] = []
  private animateParticles: boolean

  constructor(from: [number, number], to: [number, number], color: string, bend: number, now: number, animateParticles: boolean) {
    super()
    this.born = now
    this.p0 = from
    this.p1 = to
    this.animateParticles = animateParticles
    const [dx, dy] = [to[0] - from[0], to[1] - from[1]]
    const len = Math.hypot(dx, dy) || 1
    // điểm điều khiển lệch sang bên để các đường toả ra không chồng lên nhau
    this.cp = [(from[0] + to[0]) / 2 - (dy / len) * len * 0.18 * bend, (from[1] + to[1]) / 2 + (dx / len) * len * 0.18 * bend]
    const line = new Graphics()
    line.moveTo(...from).quadraticCurveTo(...this.cp, ...to).stroke({ width: 3, color, alpha: 0.55, cap: 'round' })
    line.circle(...to, 7).fill({ color, alpha: 0.8 })
    this.addChild(line)
    for (let i = 0; i < PARTICLES; i++) {
      const g = new Graphics().circle(0, 0, 12).fill({ color, alpha: 0.3 }).circle(0, 0, 6).fill('#ffffff')
      g.visible = false
      this.particles.push(g)
      this.addChild(g)
    }
  }

  /** Cập nhật theo thời gian; trả về false khi hiệu ứng đã hết. */
  update(now: number): boolean {
    const t = now - this.born
    if (t > LIFE) return false
    this.alpha = t < FADE_AT ? 1 : 1 - (t - FADE_AT) / (LIFE - FADE_AT)
    if (!this.animateParticles) return true // giảm chuyển động: chỉ giữ đường nối đứng yên
    this.particles.forEach((g, i) => {
      const p = (t - i * 160) / TRAVEL
      g.visible = p > 0 && p < 1
      if (!g.visible) return
      const q = 1 - p
      g.position.set(q * q * this.p0[0] + 2 * q * p * this.cp[0] + p * p * this.p1[0], q * q * this.p0[1] + 2 * q * p * this.cp[1] + p * p * this.p1[1])
    })
    return true
  }
}
