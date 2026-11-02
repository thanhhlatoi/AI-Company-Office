import { Application, Container, CullerPlugin, Graphics, extensions } from 'pixi.js'
import { isReducedMotion, subscribeReducedMotion } from '../../lib/useReducedMotion'
import { useAgentStore } from '../../store/agentStore'
import { isBlockedAgent, useBudgetStore } from '../../store/budgetStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useDeviceStore } from '../../store/deviceStore'
import { modelTagOf, useModelStore } from '../../store/modelStore'
import { useWorkStore } from '../../store/workStore'
import type { Layout } from '../../types/floor'
import { Camera } from '../office/Camera'
import { AgentActor } from '../sprites/AgentActor'
import { ALERT_THRESHOLDS } from '../../config/devices'
import { progressOf } from '../goals/hooks'
import { ACTOR_DEPTH_BIAS, LOWER, PERF, SIT_FEET_DY, TILE, type Dir, type Quality } from '../sprites/config'
import { catalogByKey } from '../sprites/catalog'
import { createSpriteProvider } from '../sprites/createProvider'
import { avoidOverlaps } from '../sprites/labelLayout'
import type { SpriteProvider } from '../sprites/provider'
import { FloorChunks } from './FloorChunks'
import { FloorObjects } from './FloorObjects'
import { FpsMonitor } from './fpsMonitor'
import { CHUNK } from './grid'
import { goalBoardText, rackState, safeText } from './objectState'

extensions.add(CullerPlugin) // bỏ vẽ chunk/đồ vật/nhân vật ngoài khung nhìn (chỉ những node đặt cullable)

export interface PerfInfo { fps: number | null; jsMs: number; drawn: number; total: number; quality: Quality }
export interface FloorHandlers {
  onAgentTap: (agentId: string) => void
  /** sau mỗi setLayout: các chunk vừa được dựng lại */
  onRebuilt?: (chunks: string[]) => void
  /** mỗi ~0.5s: FPS, thời gian JS mỗi frame, số node đang vẽ / tổng (sau culling) */
  onPerf?: (p: PerfInfo) => void
  /** FPS thấp liên tục nhưng người dùng đã chọn mức cố định: chỉ gợi ý */
  onSuggest?: (to: Quality) => void
  /** chế độ tự động đã tự hạ mức */
  onAutoQuality?: (to: Quality) => void
}
const MARGIN = 2 * TILE
const TOP_MARGIN = 5 * TILE // chừa chỗ cho nhãn phía trên hàng bàn đầu
const LABEL_EVERY = 10 // frame giữa hai lần tính tránh chồng nhãn

/**
 * Một tầng: nền tĩnh chia chunk (có cache) + lớp sắp độ sâu (đồ vật và nhân vật) + lớp gỡ lỗi.
 * Tự subscribe các store (agent, ngân sách, model, thiết bị, duyệt); camera dùng lại Camera của bản đồ cũ.
 */
export class FloorScene {
  /** Chunk vừa được dựng lại ở lần setLayout gần nhất (để xác nhận chỉ chunk đổi mới được cập nhật). */
  lastRebuilt: string[] = []
  private app: Application
  private handlers: FloorHandlers
  private provider: SpriteProvider
  private world = new Container()
  private chunks = new FloorChunks()
  private depth = new Container() // đồ vật + nhân vật: sắp theo zIndex = khoá độ sâu
  private debug = new Graphics()
  private objects: FloorObjects
  private camera: Camera
  private actors = new Map<string, AgentActor>()
  private seats = new Map<string, { x: number; y: number; facing: Dir; monitorId?: string }>()
  private layout: Layout | null = null
  private objectsKey = ''
  private mode: 'auto' | Quality = 'auto'
  private quality: Quality = 'medium'
  private monitor = new FpsMonitor()
  private lastSuggest = -Infinity
  private lastReport = 0
  private jsMs = 0
  private balance: number | null = null
  private reduced = isReducedMotion()
  private zoom = 0
  private frame = 0
  private dirty = true
  private fitted = false
  private cleanups: (() => void)[] = []

  static async create(host: HTMLElement, handlers: FloorHandlers) {
    const app = new Application()
    await app.init({ resizeTo: host, background: '#eef1f5', antialias: true, resolution: window.devicePixelRatio, autoDensity: true })
    app.canvas.style.display = 'block'
    host.appendChild(app.canvas)
    const { provider } = await createSpriteProvider(app.renderer)
    return new FloorScene(app, host, handlers, provider)
  }

  private constructor(app: Application, host: HTMLElement, handlers: FloorHandlers, provider: SpriteProvider) {
    this.app = app
    this.handlers = handlers
    this.provider = provider
    this.depth.sortableChildren = true
    this.debug.visible = false
    this.world.addChild(this.chunks.root, this.depth, this.debug)
    app.stage.addChild(this.world)
    this.objects = new FloorObjects(this.depth, provider)
    this.camera = new Camera(app, this.world)
    this.camera.reduced = this.reduced
    const mark = () => { this.dirty = true }
    this.cleanups.push(
      useAgentStore.subscribe(mark), useBudgetStore.subscribe(mark), useModelStore.subscribe(mark),
      useDeviceStore.subscribe(mark), useWorkStore.subscribe(mark), useDepartmentStore.subscribe(mark),
    )
    // resizeTo chỉ nghe cửa sổ; khung chứa đổi cỡ (mở panel, danh sách agent) thì phải tự báo
    const ro = new ResizeObserver(() => app.resize())
    ro.observe(host)
    this.cleanups.push(() => ro.disconnect(), subscribeReducedMotion((v) => { this.reduced = v; this.camera.reduced = v; this.actors.forEach((a) => a.setReducedMotion(v)) }))
    const onResize = () => { if (!this.camera.userMoved) this.fit(0) }
    app.renderer.on('resize', onResize)
    this.cleanups.push(() => app.renderer.off('resize', onResize))
    app.ticker.add((t) => this.tick(t.deltaMS))
  }

  setLayout(layout: Layout) {
    const first = this.layout?.floorSlug !== layout.floorSlug
    this.layout = layout
    this.lastRebuilt = this.chunks.update(layout, this.provider)
    this.handlers.onRebuilt?.(this.lastRebuilt)
    const key = JSON.stringify(layout.objects)
    if (key !== this.objectsKey) { this.objectsKey = key; this.objects.set(layout.objects) }
    this.seats.clear()
    const monitors = new Map(layout.objects.filter((o) => o.catalogKey === 'monitor' && o.agentId).map((o) => [o.agentId, o.id]))
    for (const s of layout.seats) {
      const chair = layout.objects.find((o) => o.id === s.objectId)
      const seat = catalogByKey(chair?.catalogKey ?? '')?.seat
      if (!chair || !seat) continue
      this.seats.set(s.agentId, { x: (chair.x + seat.dx) * TILE, y: (chair.y + 1) * TILE + SIT_FEET_DY, facing: s.facing, monitorId: monitors.get(s.agentId) })
    }
    for (const [id, a] of this.actors) if (!this.seats.has(id)) { a.destroy({ children: true }); this.actors.delete(id) }
    this.drawDebug()
    this.dirty = true
    if (first || !this.fitted) this.fit(0)
  }

  setDebug(v: boolean) { this.debug.visible = v }
  /** 'auto' = bắt đầu ở Vừa và tự hạ khi FPS thấp liên tục; mức cố định = không bao giờ tự đổi. */
  setQualityMode(mode: 'auto' | Quality) {
    this.mode = mode
    if (mode !== 'auto') this.applyQuality(mode)
    this.monitor.reset()
  }

  /** Số dư ngân sách công ty (micro-USD) hiện trên két sắt; null = không có dữ liệu. */
  setBalance(micro: number | null) { this.balance = micro; this.dirty = true }
  focusAgent(id: string) { const s = this.seats.get(id); if (s) this.camera.focusOn(s.x, s.y - 24) }

  destroy() {
    this.cleanups.forEach((f) => f())
    this.camera.destroy()
    this.app.destroy(true, { children: true })
  }

  private applyQuality(q: Quality) {
    this.quality = q
    this.actors.forEach((a) => a.setQuality(q))
  }

  private fit(duration: number) {
    if (!this.layout) return
    this.fitted = true
    this.camera.fit({ minX: -MARGIN, minY: -TOP_MARGIN, maxX: this.layout.width * TILE + MARGIN, maxY: this.layout.height * TILE + MARGIN }, duration)
  }

  private syncActors() {
    const agents = useAgentStore.getState().agentsById
    const blocked = useBudgetStore.getState().blocked
    const models = useModelStore.getState().key
    const devices = useDeviceStore.getState().devicesById
    const depts = useDepartmentStore.getState().departmentsById
    const waiting = new Set(Object.values(useWorkStore.getState().approvalsById).filter((a) => a.status === 'PENDING').map((a) => a.agentId))
    for (const [id, seat] of this.seats) {
      const agent = agents[id]
      let actor = this.actors.get(id)
      if (!agent) { if (actor) { actor.destroy({ children: true }); this.actors.delete(id) } continue }
      if (!actor) {
        const a = new AgentActor(id, this.provider, { onTap: this.handlers.onAgentTap, wasDragged: () => this.camera.dragged })
        a.cullable = true
        a.setQuality(this.quality)
        a.setReducedMotion(this.reduced)
        a.setZoom(this.world.scale.x)
        this.depth.addChild(a)
        this.actors.set(id, actor = a)
      }
      actor.position.set(seat.x, seat.y)
      actor.zIndex = seat.y + ACTOR_DEPTH_BIAS
      actor.update({
        agent, accent: depts[agent.departmentId ?? '']?.color ?? '#2563eb', seatFacing: seat.facing, modelTag: modelTagOf(models, id),
        hostLost: !!agent.runsOnDeviceId && devices[agent.runsOnDeviceId]?.status === 'OFFLINE', budgetBlocked: isBlockedAgent(blocked, id), waitingApproval: waiting.has(id),
      })
      if (seat.monitorId) this.objects.setState(seat.monitorId, actor.pose.screen)
    }
    this.syncObjects(devices)
  }

  /** Đồ vật có trạng thái theo dữ liệu thật: tủ rack (thiết bị), két sắt (ngân sách), bảng mục tiêu (mục tiêu đang chạy). */
  private syncObjects(devices: ReturnType<typeof useDeviceStore.getState>['devicesById']) {
    const work = useWorkStore.getState()
    const running = Object.values(work.goalsById).filter((g) => g.status === 'RUNNING').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    const tasks = running ? (work.taskIdsByGoal[running.id] ?? []).map((id) => work.tasksById[id]).filter(Boolean) : []
    const board = goalBoardText(running ? { title: running.title, pct: progressOf(running, tasks).pct } : null)
    for (const o of this.layout?.objects ?? []) {
      if (o.catalogKey === 'server_rack' && o.deviceId) this.objects.setState(o.id, rackState(devices[o.deviceId], ALERT_THRESHOLDS.cpuPct))
      else if (o.catalogKey === 'safe') this.objects.setLabel(o.id, safeText(this.balance), 'above')
      else if (o.catalogKey === 'goal_board') this.objects.setLabel(o.id, board, 'center')
    }
  }

  private tick(dt: number) {
    const t0 = performance.now()
    this.camera.tick(dt)
    if (this.dirty) { this.dirty = false; this.syncActors() }
    const now = performance.now()
    const zoom = this.world.scale.x
    if (zoom !== this.zoom) { this.zoom = zoom; this.actors.forEach((a) => a.setZoom(zoom)) }
    this.objects.tick(now, !this.reduced && this.quality !== 'low')
    const { width, height } = this.app.screen
    const near = (a: AgentActor) => { const x = this.world.x + a.x * zoom, y = this.world.y + a.y * zoom; return x > -100 && x < width + 100 && y > -100 && y < height + 200 }
    const seen: AgentActor[] = []
    for (const a of this.actors.values()) { const v = near(a); a.animate(now, v); if (v) seen.push(a) }
    if (++this.frame % LABEL_EVERY === 0) {
      const dys = avoidOverlaps(seen.map((a) => ({ id: a.agentId, ...a.labelRect() })))
      for (const a of seen) a.setLabelShift(dys.get(a.agentId) ?? 0)
    }
    this.measure(now, performance.now() - t0)
  }

  /** Đo FPS (trung bình 5 giây) và JS/frame; FPS thấp liên tục -> tự hạ (chế độ tự động) hoặc chỉ gợi ý (mức cố định). */
  private measure(now: number, jsMs: number) {
    this.jsMs = this.jsMs * 0.95 + jsMs * 0.05
    const { fps, sustainedLow } = this.monitor.frame(now)
    const lower = LOWER[this.quality]
    if (sustainedLow && lower) {
      this.monitor.reset()
      if (this.mode === 'auto') { this.applyQuality(lower); this.handlers.onAutoQuality?.(lower) }
      else if (now - this.lastSuggest > PERF.cooldownMs) { this.lastSuggest = now; this.handlers.onSuggest?.(lower) }
    }
    if (now - this.lastReport < PERF.reportMs || !this.handlers.onPerf) return
    this.lastReport = now
    const nodes = [...this.chunks.boxes(), ...this.objects.sprites(), ...this.actors.values()]
    this.handlers.onPerf({ fps, jsMs: this.jsMs, drawn: nodes.filter((n) => !n.culled).length, total: nodes.length, quality: this.quality })
  }

  /** Lưới 32px, footprint đồ vật, chỗ ngồi, ranh giới chunk. */
  private drawDebug() {
    const l = this.layout
    this.debug.clear()
    if (!l) return
    const W = l.width * TILE, H = l.height * TILE
    for (let x = 0; x <= l.width; x++) this.debug.moveTo(x * TILE, 0).lineTo(x * TILE, H)
    for (let y = 0; y <= l.height; y++) this.debug.moveTo(0, y * TILE).lineTo(W, y * TILE)
    this.debug.stroke({ width: 1, color: 0x64748b, alpha: 0.18 })
    for (let x = 0; x <= l.width; x += CHUNK) this.debug.moveTo(x * TILE, 0).lineTo(x * TILE, H)
    for (let y = 0; y <= l.height; y += CHUNK) this.debug.moveTo(0, y * TILE).lineTo(W, y * TILE)
    this.debug.stroke({ width: 2, color: 0xf97316, alpha: 0.6 })
    for (const o of l.objects) {
      const it = catalogByKey(o.catalogKey)
      if (it) this.debug.rect(o.x * TILE, o.y * TILE, it.w * TILE, it.h * TILE)
    }
    this.debug.stroke({ width: 1.5, color: 0x2563eb, alpha: 0.8 })
    for (const s of this.seats.values()) this.debug.circle(s.x, s.y, 3).fill('#16a34a')
  }
}
