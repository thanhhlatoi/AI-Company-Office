import type { Application, Container } from 'pixi.js'

const MIN_SCALE = 0.2 // đủ để thấy cả bản đồ công ty
const MAX_SCALE = 2
const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))
const easeOut = (t: number) => 1 - (1 - t) ** 3

interface View { x: number; y: number; s: number }
export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }

/** Camera 2D: kéo để di chuyển, cuộn/pinch để zoom (0.5x–2x), animate mượt tới một điểm. */
export class Camera {
  /** true nếu lần nhấn chuột/chạm hiện tại đã bị kéo -> sprite không coi là click */
  dragged = false
  /** true khi người dùng tự kéo/zoom -> không tự căn lại khi canvas đổi kích thước */
  userMoved = false
  private pointers = new Map<number, { x: number; y: number }>()
  private dragDist = 0
  private pinchDist = 0
  private stopAnim: (() => void) | null = null
  private followFn: (() => { x: number; y: number } | null) | null = null
  /** giảm chuyển động: bám theo tức thì, không làm mượt */
  reduced = false
  /** gọi khi thôi bám theo vì người dùng kéo, hoặc người được theo đã về chỗ */
  onFollowStop: (() => void) | null = null
  private cleanups: (() => void)[] = []

  private app: Application
  private world: Container

  constructor(app: Application, world: Container) {
    this.app = app
    this.world = world
    const c = app.canvas
    c.style.touchAction = 'none' // để cảm ứng kéo/zoom canvas thay vì cuộn trang
    const pos = (e: PointerEvent | WheelEvent) => {
      const r = c.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const on = <T extends Event>(type: string, fn: (e: T) => void, opts?: AddEventListenerOptions) => {
      c.addEventListener(type, fn as EventListener, opts)
      this.cleanups.push(() => c.removeEventListener(type, fn as EventListener))
    }

    on<PointerEvent>('pointerdown', (e) => {
      this.cancelAnim()
      this.pointers.set(e.pointerId, pos(e))
      if (this.pointers.size === 1) { this.dragged = false; this.dragDist = 0 }
      if (this.pointers.size === 2) this.pinchDist = this.pointerDistance()
      c.setPointerCapture(e.pointerId)
    })
    on<PointerEvent>('pointermove', (e) => {
      const prev = this.pointers.get(e.pointerId)
      if (!prev) return
      const cur = pos(e)
      this.pointers.set(e.pointerId, cur)
      if (this.pointers.size === 1) {
        this.dragDist += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y)
        if (this.dragDist > 4) this.dragged = true
        if (this.dragged) { this.userMoved = true; this.stopFollow() } // kéo chuột = thả camera
        this.world.position.x += cur.x - prev.x
        this.world.position.y += cur.y - prev.y
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()]
        const d = this.pointerDistance()
        this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinchDist)
        this.pinchDist = d
        this.dragged = true
        this.userMoved = true
      }
    })
    const up = (e: PointerEvent) => { this.pointers.delete(e.pointerId) }
    on<PointerEvent>('pointerup', up)
    on<PointerEvent>('pointercancel', up)
    on<WheelEvent>('wheel', (e) => {
      e.preventDefault()
      this.cancelAnim()
      this.userMoved = true
      const p = pos(e)
      this.zoomAt(p.x, p.y, e.deltaY < 0 ? 1.1 : 1 / 1.1)
    }, { passive: false })
  }

  private pointerDistance() {
    const [a, b] = [...this.pointers.values()]
    return Math.hypot(a.x - b.x, a.y - b.y) || 1
  }

  /** Zoom giữ nguyên điểm (sx, sy) trên màn hình đứng yên. */
  private zoomAt(sx: number, sy: number, factor: number) {
    const s0 = this.world.scale.x
    const s1 = clamp(s0 * factor)
    const k = s1 / s0
    this.world.position.set(sx - (sx - this.world.x) * k, sy - (sy - this.world.y) * k)
    this.world.scale.set(s1)
  }

  private cancelAnim() { this.stopAnim?.(); this.stopAnim = null }

  /** Chuyển camera tới view đích. `target` được tính lại mỗi frame nên theo kịp khi canvas đổi kích thước. */
  private animateTo(target: () => View, duration: number) {
    this.cancelAnim()
    const apply = (v: View) => { this.world.scale.set(v.s); this.world.position.set(v.x, v.y) }
    if (duration <= 0) return apply(target())
    const from: View = { x: this.world.x, y: this.world.y, s: this.world.scale.x }
    let t = 0
    const step = (ticker: { deltaMS: number }) => {
      t += ticker.deltaMS
      const p = easeOut(Math.min(1, t / duration))
      const to = target()
      apply({ x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p, s: from.s + (to.s - from.s) * p })
      if (p >= 1) this.cancelAnim()
    }
    this.app.ticker.add(step)
    this.stopAnim = () => this.app.ticker.remove(step)
  }

  /** Đưa điểm thế giới (wx, wy) về giữa màn hình, giữ nguyên zoom. */
  focusOn(wx: number, wy: number) {
    this.stopFollow()
    const s = this.world.scale.x
    this.animateTo(() => ({ s, x: this.app.screen.width / 2 - wx * s, y: this.app.screen.height / 2 - wy * s }), 350)
  }

  /** Căn khung `b` vào giữa màn hình. `duration` (ms) = 0 để nhảy ngay. */
  fit(b: Bounds, duration = 350) {
    this.stopFollow()
    this.userMoved = false
    this.animateTo(() => {
      const { width: W, height: H } = this.app.screen
      const s = clamp(Math.min(W / (b.maxX - b.minX), H / (b.maxY - b.minY), 1))
      return { s, x: W / 2 - ((b.minX + b.maxX) / 2) * s, y: H / 2 - ((b.minY + b.maxY) / 2) * s }
    }, duration)
  }

  /** Bám theo một điểm di động: mỗi frame kéo camera về phía điểm đó (mượt). */
  follow(getPos: () => { x: number; y: number } | null) {
    this.cancelAnim()
    this.followFn = getPos
    this.userMoved = true // đang bám: đừng tự căn lại khi canvas đổi kích thước
  }

  stopFollow() {
    if (!this.followFn) return
    this.followFn = null
    this.onFollowStop?.()
  }

  /** Gọi mỗi frame từ ticker của scene. */
  tick(dtMs: number) {
    if (!this.followFn) return
    const p = this.followFn()
    if (!p) return this.stopFollow()
    const s = this.world.scale.x
    const k = this.reduced ? 1 : 1 - Math.exp(-dtMs / 140)
    this.world.position.set(
      this.world.x + (this.app.screen.width / 2 - p.x * s - this.world.x) * k,
      this.world.y + (this.app.screen.height / 2 - p.y * s - this.world.y) * k,
    )
  }

  destroy() { this.cancelAnim(); this.cleanups.forEach((f) => f()) }
}
