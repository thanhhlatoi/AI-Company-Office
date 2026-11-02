import type { AgentActor } from '../AgentActor'
import type { Facing } from '../AgentCharacter'
import type { NavMap } from '../nav/buildNav'
import type { Point } from '../nav/NavGrid'
import type { MoveInfo } from '../../../store/motionStore'
import { MOVE } from './config'

/** Một hành trình: đi tới `to`, đứng lại, rồi về chỗ ngồi. Mọi hành trình đều do sự kiện hệ thống kích hoạt. */
export interface Journey {
  to: Point
  /** hướng nhìn khi tới nơi */
  facing: Facing
  /** đứng lại bao lâu (ms) sau khi tới; bỏ qua nếu `hold` */
  dwellMs: number
  /** true: đứng đợi tới khi gọi release() (ví dụ chờ duyệt) */
  hold?: boolean
  /** id agent chủ bàn: tới ô đứng cạnh bàn đó và xếp hàng nếu đã có người */
  queueAt?: string
  /** tên đích để panel hiển thị "Đang đi tới <đích>" */
  destName?: string
  /** hành trình mô phỏng (đi lại ngẫu nhiên), không gắn với việc thật */
  simulated?: boolean
  /** chữ trên viên thuốc trạng thái trong lúc đi ("Đang đi giao việc") */
  label?: string
  /** cầm tập giấy trên tay tới khi tới nơi */
  carry?: boolean
  /** hành trình mới có ưu tiên cao hơn sẽ ngắt hành trình đang đi/đứng chờ */
  priority?: number
  /** điểm đi qua trước khi vào chỗ (ghế họp: đứng ngoài vòng ghế rồi tiến vào theo hướng xuyên tâm, để không sượt qua người ngồi bên cạnh) */
  approach?: Point
  /** tới nơi thì ngồi xuống (phòng họp) thay vì đứng */
  sit?: boolean
  /** người đứng/ngồi xong, bắt đầu rời đi (trước khi đi về) */
  onLeave?: () => void
  onArrive?: () => void
  onDone?: () => void
  /** hành trình bị bỏ dở (kẹt quá lâu, không có đường, bị ngắt do mở lại tab / bố cục đổi) */
  onAbort?: () => void
}

type State = 'SEATED' | 'STANDING_UP' | 'WALKING' | 'ARRIVED' | 'RETURNING' | 'SITTING_DOWN'

interface Walker {
  id: string
  actor: AgentActor
  state: State
  x: number
  y: number
  path: Point[]
  seg: number // chỉ số điểm đang tiến tới trong path
  traveled: number // tổng quãng đã đi (cho nhịp bước)
  legStart: number // traveled lúc bắt đầu đoạn đường hiện tại
  legLen: number
  legSpeed: number
  legTime: number // đã đi đoạn này bao lâu (ms), kể cả lúc chờ
  legBudget: number // quá thời gian này thì bỏ đoạn đường (chống dao động/kẹt kéo dài)
  timer: number
  waitMs: number // đã bị chắn liên tục bao lâu
  stuckMs: number // tổng thời gian kẹt của đoạn đường hiện tại
  journey: Journey | null
  queue: Journey[] // hành trình xếp hàng sau hành trình hiện tại
  fade: number // 0..1 (giảm chuyển động)
  fadeDir: -1 | 0 | 1
  pendingTeleport: Point | null
  leaveCalled: boolean
  pubKey: string // trạng thái đã báo ra ngoài lần trước (chỉ báo khi đổi)
  notified: boolean // đã gọi onArrive chưa (người xếp hàng chỉ "tới nơi" khi lên tới đầu hàng)
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const facingOf = (dx: number, dy: number): Facing => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down')

/**
 * Máy trạng thái di chuyển cho mọi nhân vật:
 * SEATED -> STANDING_UP -> WALKING -> ARRIVED -> RETURNING -> SITTING_DOWN -> SEATED.
 * Chỉ tìm đường một lần mỗi đoạn (và khi phải đi vòng); mỗi frame chỉ đổi toạ độ. Không tạo Graphics.
 */
export class MovementSystem {
  private walkers = new Map<string, Walker>()
  private active = new Set<Walker>() // chỉ những người đang không ngồi yên mới tốn việc mỗi frame
  private queues = new Map<string, string[]>() // id chủ bàn -> thứ tự người xếp hàng
  private nav: () => NavMap | null
  private actorOf: (id: string) => AgentActor | undefined
  reduced = false
  /** tốc độ đi cơ bản (px/giây), chỉnh được trong Cài đặt */
  walkSpeed: number = MOVE.walkSpeed
  private onStatus: (id: string, info: MoveInfo | null) => void

  constructor(nav: () => NavMap | null, actorOf: (id: string) => AgentActor | undefined, onStatus: (id: string, info: MoveInfo | null) => void = () => {}) {
    this.nav = nav
    this.actorOf = actorOf
    this.onStatus = onStatus
  }

  get busyCount() { return this.active.size }
  /** Số người đang có hành trình mô phỏng (đi lại ngẫu nhiên): dùng để giới hạn tối đa 1-2 người cùng lúc. */
  simulatedCount() { let n = 0; for (const w of this.walkers.values()) if (w.journey?.simulated || w.queue.some((j) => j.simulated)) n++; return n }
  /** Các điểm còn lại trên đường đang đi (bắt đầu từ vị trí hiện tại) để vẽ nét đứt; null nếu không đi. */
  remainingPath(id: string): Point[] | null {
    const w = this.walkers.get(id)
    if (!w || (w.state !== 'WALKING' && w.state !== 'RETURNING') || !w.path.length) return null
    return [{ x: w.x, y: w.y }, ...w.path.slice(w.seg)]
  }
  /** Vị trí hiện tại của người đang đi (cho camera bám theo). */
  positionOf(id: string): Point | null { const w = this.walkers.get(id); return w && w.state !== 'SEATED' ? { x: w.x, y: w.y } : null }
  stateOf(id: string): State { return this.walkers.get(id)?.state ?? 'SEATED' }
  /** Người đang đứng đợi (hold) được cho phép về. */
  release(id: string) {
    const w = this.walkers.get(id)
    if (!w) return
    for (const j of [w.journey, ...w.queue]) if (j?.hold) j.hold = false // kể cả khi chưa tới nơi hoặc còn đang xếp hàng
  }

  /** Xếp một hành trình. Đang rảnh (ngồi) thì đi ngay; đang bận thì xếp hàng sau, trừ khi ưu tiên cao hơn thì ngắt. */
  start(id: string, j: Journey) {
    const actor = this.actorOf(id)
    const nav = this.nav()
    if (!actor || !nav?.places.seat[id]) return
    let w = this.walkers.get(id)
    if (!w) {
      const seat = nav.places.seat[id]
      w = { id, actor, state: 'SEATED', x: seat.x, y: seat.y, path: [], seg: 0, traveled: 0, legStart: 0, legLen: 0, legSpeed: 0, legTime: 0, legBudget: 0, timer: 0, waitMs: 0, stuckMs: 0, journey: null, queue: [], fade: 1, fadeDir: 0, pendingTeleport: null, notified: false, leaveCalled: false, pubKey: '' }
      this.walkers.set(id, w)
    }
    if (w.state === 'SEATED') return this.begin(w, j)
    if ((j.priority ?? 0) > (w.journey?.priority ?? 0) && (w.state === 'WALKING' || w.state === 'ARRIVED')) {
      this.leaveQueue(w)
      w.journey = j
      w.notified = false
      w.leaveCalled = false
      this.applyJourneyLook(w, j)
      w.state = 'WALKING'
      return this.planPath(w, this.destination(w))
    }
    w.queue.push(j)
  }

  /** Mở lại tab / bố cục đổi: đưa mọi người về chỗ ngồi tức thì, bỏ hết hành trình (không phát lại hoạt ảnh cũ). */
  resetAll() { for (const w of [...this.walkers.values()]) this.snapHome(w, true) }
  remove(id: string) {
    const w = this.walkers.get(id)
    if (!w) return
    this.leaveQueue(w)
    this.active.delete(w)
    this.walkers.delete(id)
  }

  // ---- bắt đầu / kết thúc ----

  private begin(w: Walker, j: Journey) {
    w.journey = j
    w.state = 'STANDING_UP'
    w.timer = 0
    w.notified = false
    w.leaveCalled = false
    this.applyJourneyLook(w, j)
    w.actor.setPose('STANDING', facingOf(j.to.x - w.x, j.to.y - w.y)) // đứng dậy
    this.active.add(w)
    this.publish(w)
  }

  private applyJourneyLook(w: Walker, j: Journey) {
    w.actor.character.setStatusOverride(j.label ?? null)
    w.actor.character.setCarry(!!j.carry)
  }

  /** Báo một lần duy nhất rằng người này bắt đầu rời nơi đã tới (hoặc bị bỏ dở sau khi tới). */
  private callLeave(w: Walker) {
    if (w.leaveCalled || !w.notified) return
    w.leaveCalled = true
    w.journey?.onLeave?.()
  }

  /** Về hẳn chỗ ngồi (xong hành trình, hoặc bị kẹt quá lâu): chỉ đổi trạng thái, không tính đường. */
  private snapHome(w: Walker, aborted: boolean) {
    const seat = this.nav()?.places.seat[w.id]
    this.leaveQueue(w)
    this.callLeave(w)
    const abort = aborted ? w.journey?.onAbort : undefined
    w.journey = null
    w.queue = []
    w.path = []
    w.state = 'SEATED'
    w.fade = 1
    w.fadeDir = 0
    w.pendingTeleport = null
    if (seat) { w.x = seat.x; w.y = seat.y }
    w.actor.character.setStatusOverride(null)
    w.actor.character.setCarry(false)
    w.actor.character.setAway(false)
    w.actor.character.setFade(1)
    w.actor.setPose('SEATED', 'down')
    w.actor.character.position.set(w.x, w.y)
    this.active.delete(w)
    this.publish(w)
    abort?.()
  }

  private finish(w: Walker) {
    const done = w.journey?.onDone
    const next = w.queue.shift()
    this.snapHome(w, false)
    done?.()
    if (next) this.begin(w, next)
  }

  // ---- hàng đợi tại bàn ----

  private slotPoint(deskId: string, index: number): Point | null {
    const v = this.nav()?.places.visit[deskId]
    return v ? { x: v.x, y: v.y + MOVE.queueGap * index } : null // hàng xếp dọc xuống phía dưới ô đứng
  }

  private destination(w: Walker): Point {
    const j = w.journey as Journey
    if (j.queueAt) {
      const q = this.queues.get(j.queueAt)
      const slot = q ? this.slotPoint(j.queueAt, Math.max(0, q.indexOf(w.id))) : null
      if (slot) return slot
    }
    return j.to
  }

  private joinQueue(w: Walker) {
    const key = w.journey?.queueAt
    if (!key) return
    const q = this.queues.get(key) ?? []
    if (!q.includes(w.id)) q.push(w.id)
    this.queues.set(key, q)
  }

  /** Rời hàng đợi; những người sau tiến lên một ô. */
  private leaveQueue(w: Walker) {
    const key = w.journey?.queueAt
    const q = key ? this.queues.get(key) : undefined
    if (!key || !q) return
    const i = q.indexOf(w.id)
    if (i < 0) return
    q.splice(i, 1)
    for (const id of q.slice(i)) { // người sau dời lên một ô
      const o = this.walkers.get(id)
      if (o && (o.state === 'ARRIVED' || o.state === 'WALKING')) { o.state = 'WALKING'; this.planPath(o, this.destination(o)) }
    }
  }

  // ---- tìm đường (một lần mỗi đoạn) ----

  /** Trả về false nếu không có đường: tìm đường vòng thất bại thì giữ đường cũ (và chờ), tìm đường chính thất bại thì về chỗ. */
  private planPath(w: Walker, to: Point, avoid?: Point[]): boolean {
    const grid = this.nav()?.grid
    let path = grid?.findPath({ x: w.x, y: w.y }, to, avoid)
    const ap = w.state === 'WALKING' && to === w.journey?.to ? w.journey?.approach : undefined
    if (ap && grid) {
      const first = grid.findPath({ x: w.x, y: w.y }, ap, avoid)
      if (first) path = [...first, { ...to }]
    }
    if (!path) { if (!avoid) this.snapHome(w, true); return false } // không có đường: về chỗ, không bao giờ đứng mãi
    w.path = path
    w.seg = 1
    w.legStart = w.traveled
    w.legLen = path.reduce((n, p, i) => n + (i ? dist(p, path[i - 1]) : 0), 0)
    // tốc độ cơ bản: 90px/s, quãng dài tự tăng để không quá ~10 giây (tối đa maxSpeed)
    w.legSpeed = Math.min(MOVE.maxSpeed, Math.max(this.walkSpeed, w.legLen / MOVE.maxTripSeconds))
    w.waitMs = 0
    w.stuckMs = 0
    if (!avoid) { // tìm đường vòng không làm lại đồng hồ của đoạn đường
      w.legTime = 0
      w.legBudget = (w.legLen / w.legSpeed) * 1000 * 2.2 + 5000
    }
    return true
  }

  // ---- cập nhật mỗi frame ----

  update(dtMs: number) {
    const dt = Math.min(dtMs, 50) // tab bị treo rồi quay lại: không nhảy một bước dài
    for (const w of this.active) this.step(w, dt)
  }

  private step(w: Walker, dt: number) {
    this.advance(w, dt)
    this.publish(w)
  }

  /** Báo trạng thái di chuyển ra ngoài (panel) — chỉ khi nó đổi. */
  private publish(w: Walker) {
    const info: MoveInfo | null = w.state === 'SEATED' || !w.journey ? null : { state: w.state, dest: w.state === 'RETURNING' ? null : w.journey.destName ?? null, simulated: !!w.journey.simulated }
    const key = info ? `${info.state}|${info.dest}|${info.simulated}` : ''
    if (key === w.pubKey) return
    w.pubKey = key
    this.onStatus(w.id, info)
  }

  private advance(w: Walker, dt: number) {
    if (this.reduced) return this.stepReduced(w, dt)
    switch (w.state) {
      case 'STANDING_UP':
        w.timer += dt
        if (w.timer >= MOVE.standUpMs) {
          if (w.journey?.queueAt) this.joinQueue(w)
          w.state = 'WALKING'
          this.planPath(w, this.destination(w))
        }
        break
      case 'WALKING':
      case 'RETURNING':
        this.walk(w, dt)
        break
      case 'ARRIVED': {
        const j = w.journey as Journey
        const q = j.queueAt ? this.queues.get(j.queueAt) : undefined
        if (q && q[0] !== w.id) break // còn người đứng trước: đứng xếp hàng, chưa tính thời gian
        if (!w.notified) { w.notified = true; j.onArrive?.() }
        w.timer += dt
        if (!j.hold && w.timer >= j.dwellMs) this.goHome(w)
        break
      }
      case 'SITTING_DOWN':
        w.timer += dt
        if (w.timer >= MOVE.sitDownMs) this.finish(w)
        break
      default:
        break
    }
  }

  private goHome(w: Walker) {
    this.callLeave(w)
    w.actor.character.setAway(false)
    this.leaveQueue(w)
    w.actor.character.setCarry(false) // đã trao xong
    w.state = 'RETURNING'
    const seat = this.nav()?.places.seat[w.id]
    if (!seat) return this.snapHome(w, true)
    this.planPath(w, seat)
  }

  private arrive(w: Walker) {
    w.x = w.path[w.path.length - 1].x
    w.y = w.path[w.path.length - 1].y
    if (w.state === 'RETURNING') {
      w.state = 'SITTING_DOWN'
      w.timer = 0
      w.actor.setPose('STANDING', 'down') // quay mặt vào bàn rồi ngồi xuống
      w.actor.character.position.set(w.x, w.y)
      return
    }
    w.state = 'ARRIVED'
    w.timer = 0
    this.settle(w)
  }

  /** Tư thế khi tới nơi: đứng, hoặc ngồi (họp). Ngồi chỗ khác thì bàn của mình vẫn ở chế độ chờ. */
  private settle(w: Walker) {
    const j = w.journey as Journey
    if (j.sit) { w.actor.character.setPose('SEATED', j.facing); w.actor.character.setAway(true) } else w.actor.setPose('STANDING', j.facing)
    w.actor.character.position.set(w.x, w.y)
  }

  /** Người đang đứng gần điểm nhìn trước mặt (trừ chính mình); người ngồi đã là vật cản trong lưới nên không tính. */
  private blocker(w: Walker, dx: number, dy: number): Walker | null {
    const ax = w.x + dx * MOVE.lookAhead, ay = w.y + dy * MOVE.lookAhead
    for (const o of this.walkers.values()) {
      if (o === w || o.state === 'SEATED') continue
      if (Math.hypot(o.x - ax, o.y - ay) < MOVE.personRadius && (o.x - w.x) * dx + (o.y - w.y) * dy > 0) return o
      // Hai người sắp chồng lên nhau từ bên hông (đi song song/giao nhau): người có id lớn hơn nhường để không bao giờ cùng chờ nhau
      if (Math.hypot(o.x - w.x, o.y - w.y) < MOVE.touchRadius && Number(w.id) > Number(o.id)) return o
    }
    return null
  }

  private walk(w: Walker, dt: number) {
    w.legTime += dt
    if (w.legTime > w.legBudget) return this.giveUp(w) // quá lâu so với dự kiến: bỏ đoạn này, không bao giờ đứng/đi vòng mãi
    const target = w.path[w.seg]
    if (!target) return this.arrive(w)
    let dx = target.x - w.x, dy = target.y - w.y
    const d = Math.hypot(dx, dy)
    if (d > 0) { dx /= d; dy /= d }

    // có người chắn phía trước: đứng chờ, quá 1s thì đi vòng, quá 3s thì bỏ hành trình đi tắt về chỗ
    const other = d > 0 ? this.blocker(w, dx, dy) : null
    if (other) {
      w.waitMs += dt
      w.stuckMs += dt
      w.actor.setPose('STANDING', facingOf(dx, dy))
      if (w.stuckMs >= MOVE.giveUpAfterMs) return this.giveUp(w)
      if (w.waitMs >= MOVE.repathAfterMs) {
        const around = [...this.walkers.values()].filter((o) => o !== w && o.state !== 'SEATED' && Math.hypot(o.x - w.x, o.y - w.y) < 80)
        const stuck = w.stuckMs
        const goal = w.state === 'RETURNING' ? (this.nav()?.places.seat[w.id] as Point) : this.destination(w)
        this.planPath(w, goal, around.map((o) => ({ x: o.x, y: o.y })))
        w.stuckMs = stuck // tổng thời gian kẹt vẫn được cộng dồn
        w.waitMs = 0 // thử đường mới ít nhất một lần nữa sau 1s
      }
      return
    }
    w.waitMs = 0
    w.stuckMs = Math.max(0, w.stuckMs - dt * 2) // đi được thì thời gian kẹt giảm dần

    // tăng/giảm tốc nhẹ ở đầu và cuối đoạn đường
    const sIn = w.traveled - w.legStart, sOut = w.legLen - sIn
    const ease = 0.3 + 0.7 * Math.min(1, sIn / MOVE.easeDistance, sOut / MOVE.easeDistance)
    const step = Math.min(d, (w.legSpeed * ease * dt) / 1000)
    w.x += dx * step
    w.y += dy * step
    w.traveled += step
    if (step >= d - 0.001) w.seg++ // tới điểm rẽ, lần sau hướng về điểm kế
    w.actor.setPose('WALKING', facingOf(dx, dy))
    w.actor.character.setWalkDistance(w.traveled)
    w.actor.character.position.set(w.x, w.y)
    if (w.seg >= w.path.length) this.arrive(w)
  }

  /** Kẹt quá lâu. Đang đi tới đích -> bỏ hành trình, về chỗ; đang về chỗ mà vẫn kẹt -> về hẳn ghế (không bao giờ đứng mãi). */
  private giveUp(w: Walker) {
    if (w.state === 'RETURNING') return this.snapHome(w, true)
    w.journey?.onAbort?.()
    this.leaveQueue(w)
    w.actor.character.setCarry(false)
    w.state = 'RETURNING'
    const seat = this.nav()?.places.seat[w.id]
    if (!seat) return this.snapHome(w, true)
    this.planPath(w, seat)
  }

  // ---- giảm chuyển động: không đi bộ, mờ đi rồi hiện ở nơi khác ----

  private stepReduced(w: Walker, dt: number) {
    const fadeStep = dt / MOVE.fadeMs
    if (w.fadeDir !== 0) {
      w.fade = Math.max(0, Math.min(1, w.fade + w.fadeDir * fadeStep))
      w.actor.character.setFade(w.fade)
      if (w.fadeDir === -1 && w.fade <= 0) { // đã mờ hẳn: dịch chuyển rồi hiện lại
        w.fadeDir = 1
        const to = w.pendingTeleport as Point
        w.x = to.x; w.y = to.y
        w.actor.character.position.set(to.x, to.y)
        if (w.state === 'RETURNING') { w.state = 'SITTING_DOWN'; w.timer = 0; w.actor.setPose('SEATED', 'down') } else { w.state = 'ARRIVED'; w.timer = 0; w.notified = true; this.settle(w); w.journey?.onArrive?.() }
      } else if (w.fadeDir === 1 && w.fade >= 1) w.fadeDir = 0
      return
    }
    if (w.state === 'STANDING_UP' || w.state === 'WALKING') {
      w.state = 'WALKING'
      w.pendingTeleport = this.destination(w)
      w.fadeDir = -1
    } else if (w.state === 'ARRIVED') {
      const j = w.journey as Journey
      w.timer += dt
      if (!j.hold && w.timer >= j.dwellMs) { this.callLeave(w); w.actor.character.setAway(false); w.actor.character.setCarry(false); w.state = 'RETURNING'; w.pendingTeleport = this.nav()?.places.seat[w.id] ?? { x: w.x, y: w.y }; w.fadeDir = -1 }
    } else if (w.state === 'SITTING_DOWN') {
      w.timer += dt
      if (w.timer >= MOVE.sitDownMs) this.finish(w)
    }
  }
}
