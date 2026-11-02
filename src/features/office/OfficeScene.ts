import { Application, Container, Graphics } from 'pixi.js'
import { INFRA_SLUG, departmentConfig } from '../../config/departments'
import { motionQuery } from '../../lib/motion'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useBudgetStore, isBlockedAgent } from '../../store/budgetStore'
import { useModelStore, modelTagOf } from '../../store/modelStore'
import { useDeviceStore } from '../../store/deviceStore'
import { useMotionStore } from '../../store/motionStore'
import { useSettingsStore } from '../../store/settingsStore'
import { groupByDepartment, statsOf } from '../../store/selectors'
import { useRealtimeStore, type Dispatch } from '../../store/realtimeStore'
import { useUiStore } from '../../store/uiStore'
import { DispatchEffect } from './DispatchEffect'
import { AgentActor } from './AgentActor'
import type { Facing, Pose } from './AgentCharacter'
import { Camera, type Bounds } from './Camera'
import { buildNav, type NavMap } from './nav/buildNav'
import { NavDebug } from './nav/NavDebug'
import { MotionDirector } from './movement/MotionDirector'
import { MovementSystem } from './movement/MovementSystem'
import { PathPreview } from './movement/PathPreview'
import { COMMON_DEPARTMENT, ORPHAN_DEPARTMENT, computeLayout, type OfficeLayout, type Rect } from './layout'
import type { MotionMessage } from '../../types'
import { RoomView } from './RoomView'
import { DeviceCables } from './devices/DeviceCables'
import { DeviceView } from './devices/DeviceView'

export interface SceneHandlers {
  onAgentTap: (agentId: string) => void
  onDepartmentTap: (departmentId: string) => void
  onDepartmentSignTap: (departmentId: string) => void
  onAddAgent: (departmentId: string) => void
  onDeviceTap: (deviceId: string) => void
}

const MARGIN = 80
const DIM_ALPHA = 0.3
const LOST_HOST_ALPHA = 0.55 // agent chạy trên máy OFFLINE: mờ nhẹ
const FILTER_ALPHA = 0.2 // agent không khớp bộ lọc trạng thái
const LOD_FAR_SCALE = 0.6 // zoom nhỏ hơn mức này = chế độ xa (bản đồ công ty)
const toBounds = (r: Rect): Bounds => ({ minX: r.x - MARGIN, maxX: r.x + r.w + MARGIN, minY: r.y - MARGIN, maxY: r.y + r.h + MARGIN })

/** Đợi font Inter sẵn sàng để Pixi đo/vẽ chữ đúng (tối đa 2s, lỗi thì dùng font dự phòng). */
async function loadFonts() {
  try {
    await Promise.race([
      Promise.all(['400 12px Inter', '600 12px Inter', '700 13px Inter'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 2000)),
    ])
  } catch { /* dùng font dự phòng */ }
}

/**
 * MỘT canvas cho cả hai chế độ: "Toàn công ty" = camera fit mọi phòng;
 * "Trong phòng" = camera fit một phòng, các phòng khác mờ đi. Tự subscribe Zustand (không nhận props).
 */
export class OfficeScene {
  private app: Application
  private handlers: SceneHandlers
  private world = new Container()
  private roomLayer = new Container()
  private deskLayer = new Container()
  private characterLayer = new Container() // nằm trên mọi bàn: người đi ngang qua bàn khác vẫn hiện rõ
  private effectLayer = new Container()
  private deviceLayer = new Container() // thiết bị + cáp mạng (phòng Hạ tầng), dưới nhân vật
  private cables = new DeviceCables()
  private devices = new Map<string, DeviceView>()
  private devKey = '' // id+trạng thái thiết bị: đổi thì phải dựng lại (agent "Mất máy chủ" phụ thuộc vào đây)
  private infraId: string | null = null
  private lostHost = new Set<string>()
  private effects: DispatchEffect[] = []
  // Lưới đường đi: dựng lại CHỈ khi bố cục (phòng/bàn) đổi, không phải mỗi lần đổi trạng thái agent
  private nav: NavMap | null = null
  private navKey = ''
  private navDebug = new NavDebug()
  readonly movement = new MovementSystem(() => this.nav, (id) => this.actors.get(id), (id, info) => useMotionStore.getState().setMoving(id, info))
  private director = new MotionDirector({
    movement: this.movement,
    nav: () => this.nav,
    actor: (id) => this.actors.get(id),
    agents: () => useAgentStore.getState().agentsById,
    departments: () => useDepartmentStore.getState().departmentsById,
    hasApproval: (id) => Object.values(useRealtimeStore.getState().approvals).includes(id),
  })
  // Rê chuột vào người đang đi: hiện đường còn lại bằng nét đứt
  private pathPreview = new PathPreview()
  private hoverId: string | null = null
  private pathTick = 0
  private wanderTimer: ReturnType<typeof setInterval> | null = null
  private perfMs = 0 // thời gian chạy trung bình của một frame trong ticker (ms), để kiểm tra hiệu năng
  private debugDirty = true
  private rooms = new Map<string, RoomView>()
  private actors = new Map<string, AgentActor>()
  private deptOfAgent = new Map<string, string>()
  private camera: Camera
  private layout: OfficeLayout = { rooms: {}, rugs: {}, desks: {}, devices: {}, bounds: { x: 0, y: 0, w: 0, h: 0 } }
  private resizeObserver: ResizeObserver
  private unsubscribes: (() => void)[]
  private focusId: string | null
  private selectedId: string | null
  private fitted = false
  private far = false
  private reducedMotion = false
  private motion = motionQuery()
  private onMotionChange = (e: MediaQueryListEvent) => { this.reducedMotion = e.matches; this.movement.reduced = e.matches; this.camera.reduced = e.matches }
  // Quay lại tab: đưa mọi người về chỗ theo trạng thái hiện tại, không phát lại hoạt ảnh cũ
  private onVisibility = () => { if (!document.hidden) { this.movement.resetAll(); this.director.reset() } }

  /** Chỉ khi dev: phím P đổi tư thế của agent đang chọn (ngồi -> đứng -> đi, 4 hướng) để xem các tư thế. */
  private devStep = 0
  private onDevKey = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() !== 'p' || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return
    const actor = this.selectedId ? this.actors.get(this.selectedId) : undefined
    if (!actor) return
    const facings: Facing[] = ['down', 'left', 'right', 'up']
    const steps: [Pose, Facing][] = [['SEATED', 'down'], ...facings.map((f): [Pose, Facing] => ['STANDING', f]), ...facings.map((f): [Pose, Facing] => ['WALKING', f])]
    this.devStep = (this.devStep + 1) % steps.length
    actor.setPose(...steps[this.devStep])
  }

  /** Phím Shift+G (G thường = "Mục tiêu mới"): bật/tắt lớp debug đường đi. Shift+bấm vào một ô: vẽ đường đi từ chỗ ngồi của agent đang chọn tới ô đó. */
  private onDebugKey = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() !== 'g' || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return
    this.navDebug.visible = !this.navDebug.visible
    this.refreshDebug()
  }

  private onDebugClick = (e: MouseEvent) => {
    if (!this.navDebug.visible || !e.shiftKey || !this.nav) return
    const rect = this.app.canvas.getBoundingClientRect()
    const to = this.world.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    const from = this.selectedId ? this.nav.places.seat[this.selectedId] : undefined
    if (!from) return this.navDebug.setPath(null)
    if (!this.nav.grid.isFreeAt(to.x, to.y)) return this.navDebug.setPath(null, 'ô bị chặn')
    const t0 = performance.now()
    const path = this.nav.grid.findPath(from, to)
    const ms = performance.now() - t0
    if (path) this.movement.start(this.selectedId as string, { to, facing: 'left', dwellMs: 1500, label: 'Đang đi thử' })
    this.navDebug.setPath(path, path ? `${path.length} điểm · ${Math.round(path.reduce((n, p, i) => n + (i ? Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y) : 0), 0))} px · ${ms.toFixed(1)} ms` : 'không có đường')
  }

  private refreshDebug() {
    if (this.navDebug.visible && this.debugDirty && this.nav) { this.navDebug.draw(this.nav); this.debugDirty = false }
  }

  /** Chỉ khi dev: H = Sales giao việc cho Mua hàng, R = báo cáo trưởng phòng, A = xin duyệt, M = họp Studio YouTube, C = hết họp. */
  private onDemoKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return
    const agents = Object.values(useAgentStore.getState().agentsById)
    const by = (name: string) => agents.find((a) => a.name === name)
    const rt = useRealtimeStore.getState()
    const k = e.key.toLowerCase()
    if (k === 'h' && by('Sales') && by('Mua hàng')) rt.pushMotion({ type: 'task.handoff', fromAgentId: by('Sales')!.id, toAgentId: by('Mua hàng')!.id, taskId: '0', message: 'Mua giúp mình 20 cuốn sách' })
    if (k === 'r' && by('Frontend')) rt.pushMotion({ type: 'report.to_head', agentId: by('Frontend')!.id, departmentId: by('Frontend')!.departmentId ?? '', taskId: '0' })
    if (k === 'a' && by('Backend')) rt.addApproval('dev-' + Date.now(), by('Backend')!.id)
    if (k === 'm' || k === 'c') {
      const yt = agents.filter((a) => a.departmentId && a.departmentId === by('Biên tập trưởng')?.departmentId).slice(0, 5)
      if (k === 'm' && yt.length) rt.pushMotion({ type: 'meeting.started', departmentId: yt[0].departmentId ?? '', agentIds: yt.map((a) => a.id) })
      if (k === 'c' && yt.length) rt.pushMotion({ type: 'meeting.ended', departmentId: yt[0].departmentId ?? '' })
    }
  }

  /** Chỉ khi dev: phím W cho 10 người đi cùng lúc (cà phê, chờ duyệt, ghế họp, xếp hàng ở một bàn) để thử va chạm và hàng đợi. */
  private onStressKey = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() !== 'w' || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName) || !this.nav) return
    const P = this.nav.places
    const ids = [...this.actors.keys()].sort(() => Math.random() - 0.5)
    const deskOwner = ids.pop() as string
    const mc = P.meetingCenter
    const jobs: ((id: string) => void)[] = [
      (id) => this.movement.start(id, { to: P.coffee, facing: 'up', dwellMs: 2500, label: 'Pha cà phê (thử)' }),
      (id) => this.movement.start(id, { to: P.approval, facing: 'up', dwellMs: 2500, label: 'Chờ duyệt (thử)' }),
      ...P.meetingSeats.slice(0, 3).map((s) => (id: string) => this.movement.start(id, { to: s, facing: Math.abs(mc.x - s.x) > Math.abs(mc.y - s.y) ? (mc.x < s.x ? 'left' : 'right') : mc.y < s.y ? 'up' : 'down', dwellMs: 3000, label: 'Đang họp (thử)' })),
      ...[0, 1, 2].map(() => (id: string) => this.movement.start(id, { to: P.visit[deskOwner], queueAt: deskOwner, facing: 'left', dwellMs: 2000, carry: true, label: 'Đang đi giao việc (thử)' })),
      (id) => this.movement.start(id, { to: P.visit[ids[0]], facing: 'left', dwellMs: 1500, label: 'Đi thử' }),
    ]
    jobs.forEach((job, i) => ids[i + 1] && job(ids[i + 1]))
  }

  static async create(host: HTMLElement, handlers: SceneHandlers) {
    await loadFonts()
    const app = new Application()
    await app.init({ resizeTo: host, background: '#eef1f5', antialias: true, resolution: window.devicePixelRatio, autoDensity: true })
    app.canvas.style.display = 'block' // bỏ khe baseline của thẻ inline
    host.appendChild(app.canvas)
    return new OfficeScene(app, host, handlers)
  }

  private constructor(app: Application, host: HTMLElement, handlers: SceneHandlers) {
    this.app = app
    this.handlers = handlers
    this.deviceLayer.addChild(this.cables)
    this.world.addChild(this.drawGround(), this.roomLayer, this.deviceLayer, this.deskLayer, this.characterLayer, this.effectLayer, this.pathPreview, this.navDebug)
    app.stage.addChild(this.world)
    this.camera = new Camera(app, this.world)
    this.reducedMotion = this.motion.matches
    this.movement.reduced = this.reducedMotion
    this.camera.reduced = this.reducedMotion
    this.camera.onFollowStop = () => useMotionStore.getState().setFollow(null)
    this.movement.walkSpeed = useSettingsStore.getState().walkSpeed
    // Đi lại ngẫu nhiên khi rảnh: chỉ chạy khi người dùng bật trong Cài đặt
    this.wanderTimer = setInterval(() => { if (useSettingsStore.getState().randomWalk && !document.hidden) this.director.wander() }, 5000)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.motion.addEventListener('change', this.onMotionChange)
    app.ticker.add((ticker) => {
      const t0 = performance.now()
      this.movement.update(ticker.deltaMS)
      this.camera.tick(ticker.deltaMS)
      this.updatePathPreview(ticker.deltaMS)
      this.updateLod()
      const now = performance.now()
      this.effects = this.effects.filter((fx) => fx.update(now) || (fx.destroy({ children: true }), false))
      for (const a of this.actors.values()) a.animate(now)
      for (const v of this.devices.values()) v.animate(now, this.reducedMotion)
      this.cables.animate(now, this.reducedMotion)
      if (!this.reducedMotion) for (const r of this.rooms.values()) r.animate(now) // trang trí: tắt khi giảm chuyển động
      this.perfMs += (performance.now() - t0 - this.perfMs) * 0.05
    })
    if (import.meta.env.DEV) (window as unknown as { __officePerf?: () => unknown }).__officePerf = () => ({ frameMs: +this.perfMs.toFixed(3), fps: Math.round(app.ticker.FPS), walkers: this.movement.busyCount, actors: this.actors.size })
    // Panel phải mở/đóng làm đổi kích thước host; căn lại camera ngay nếu người dùng chưa tự kéo/zoom
    this.resizeObserver = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      if (!width || !height) return
      app.renderer.resize(width, height)
      if (!this.camera.userMoved) this.flyTo(this.focusId, 0)
    })
    this.resizeObserver.observe(host)

    if (import.meta.env.DEV) { window.addEventListener('keydown', this.onDevKey); window.addEventListener('keydown', this.onStressKey); window.addEventListener('keydown', this.onDemoKey) }
    window.addEventListener('keydown', this.onDebugKey)
    app.canvas.addEventListener('click', this.onDebugClick)
    this.focusId = useUiStore.getState().focusDepartmentId
    this.selectedId = useAgentStore.getState().selectedAgentId
    this.rebuild()
    this.unsubscribes = [
      useAgentStore.subscribe((s, prev) => {
        if (s.agentsById !== prev.agentsById) this.rebuild()
        if (s.selectedAgentId !== prev.selectedAgentId) this.select(s.selectedAgentId)
      }),
      useDepartmentStore.subscribe((s, prev) => { if (s.departmentsById !== prev.departmentsById) this.rebuild() }),
      useRealtimeStore.subscribe((s, prev) => {
        if (s.lastDispatch && s.lastDispatch !== prev.lastDispatch) this.spawnDispatch(s.lastDispatch)
        if (s.lastMotion && s.lastMotion !== prev.lastMotion) {
          this.director.handle(s.lastMotion.event)
          if (s.lastMotion.event.type === 'task.handoff') this.spawnHandoff(s.lastMotion.event)
        }
        if (s.approvals !== prev.approvals) this.syncAttention()
      }),
      useBudgetStore.subscribe((s, prev) => { if (s.blocked !== prev.blocked) this.rebuild() }), // agent hết ngân sách đổi -> vẽ lại nhãn
      useModelStore.subscribe((s, prev) => { if (s.key !== prev.key) this.rebuild() }), // model đang dùng đổi -> vẽ lại huy hiệu LOCAL/CLOUD
      useDeviceStore.subscribe((s, prev) => {
        if (s.devicesById !== prev.devicesById) { if (this.deviceKey() !== this.devKey) this.rebuild(); else this.syncDevices() }
        if (s.links !== prev.links) this.syncDevices()
        if (s.selectedId !== prev.selectedId) { this.devices.get(prev.selectedId ?? '')?.setSelected(false); this.devices.get(s.selectedId ?? '')?.setSelected(true) }
        if (s.lastAlert && s.lastAlert !== prev.lastAlert) this.inspect(s.lastAlert.deviceId)
      }),
      useMotionStore.subscribe((s, prev) => {
        if (s.followId === prev.followId) return
        if (s.followId) { const id = s.followId; this.camera.follow(() => this.movement.positionOf(id)) } else this.camera.stopFollow()
      }),
      useSettingsStore.subscribe((s, prev) => { if (s.walkSpeed !== prev.walkSpeed) this.movement.walkSpeed = s.walkSpeed }),
      useUiStore.subscribe((s, prev) => {
        if (s.statusFilter !== prev.statusFilter) this.dim()
        if (s.focusDepartmentId === prev.focusDepartmentId) return
        this.focusId = s.focusDepartmentId
        this.dim()
        this.flyTo(this.focusId, 500) // bay mượt 0.5s
      }),
    ]
  }

  /** Nền đất: lưới ô mờ phía dưới các phòng, giúp thấy chuyển động khi kéo/zoom. */
  private drawGround() {
    const g = new Graphics()
    const N = 6000, STEP = 80
    for (let v = -N; v <= N; v += STEP) g.moveTo(v, -N).lineTo(v, N).moveTo(-N, v).lineTo(N, v)
    return g.stroke({ width: 1, color: '#e3e7ed' })
  }

  /** Dựng lại phòng + bàn từ store. Chỉ tạo/xoá sprite khi agent/phòng thêm/bớt; còn lại cập nhật theo id. */
  private rebuild() {
    const agents = useAgentStore.getState().agentsById
    const all = Object.values(agents)
    const byDept = groupByDepartment(agents)
    const orphans = all.filter((a) => !a.departmentId)
    const depts = Object.values(useDepartmentStore.getState().departmentsById)
    if (orphans.length) { depts.push(ORPHAN_DEPARTMENT); byDept[ORPHAN_DEPARTMENT.id] = orphans }
    if (depts.length) depts.push(COMMON_DEPARTMENT)
    const devs = useDeviceStore.getState().devicesById
    this.infraId = depts.find((d) => d.slug === INFRA_SLUG)?.id ?? null
    this.devKey = this.deviceKey()
    this.layout = computeLayout(depts, byDept, Object.keys(devs))
    // Chữ ký bố cục: chỉ dựng lại lưới khi phòng/bàn/vai trò trưởng phòng đổi
    const navKey = JSON.stringify([this.layout.rooms, this.layout.desks, this.layout.devices, all.map((a) => a.isHead)])
    if (navKey !== this.navKey) {
      this.navKey = navKey
      this.movement.resetAll() // bố cục đổi: đường đi cũ không còn đúng
      this.director.reset()
      this.nav = buildNav(this.layout, agents, useDepartmentStore.getState().departmentsById)
      this.debugDirty = true
      this.refreshDebug()
    }

    const liveRooms = new Set<string>()
    for (const d of depts) {
      let room = this.rooms.get(d.id)
      if (!room) {
        room = new RoomView(d.id, { onTap: (id) => this.handlers.onDepartmentTap(id), onSignTap: (id) => this.handlers.onDepartmentSignTap(id), onAddAgent: (id) => this.handlers.onAddAgent(id) }, () => this.camera.dragged)
        this.rooms.set(d.id, room)
        this.roomLayer.addChild(room)
        room.setLod(this.far)
      }
      liveRooms.add(d.id)
      room.update(d, this.layout.rooms[d.id], this.layout.rugs[d.id])
      if (d.id !== COMMON_DEPARTMENT.id) room.setStats(statsOf(byDept[d.id] ?? []))
    }
    for (const [id, room] of this.rooms) if (!liveRooms.has(id)) { room.destroy({ children: true }); this.rooms.delete(id) }

    this.deptOfAgent.clear()
    this.lostHost.clear()
    for (const a of all) {
      this.deptOfAgent.set(a.id, a.departmentId ?? '')
      const hostLost = !!a.runsOnDeviceId && devs[a.runsOnDeviceId]?.status === 'OFFLINE'
      if (hostLost) this.lostHost.add(a.id)
      let actor = this.actors.get(a.id)
      if (!actor) {
        actor = new AgentActor(a.id, (id) => this.handlers.onAgentTap(id), () => this.camera.dragged)
        this.actors.set(a.id, actor)
        this.deskLayer.addChild(actor.desk)
        this.characterLayer.addChild(actor.character)
        actor.character.on('pointerover', () => { this.hoverId = a.id })
        actor.character.on('pointerout', () => { if (this.hoverId === a.id) { this.hoverId = null; this.pathPreview.hide() } })
        actor.setLod(this.far)
        if (a.id === this.selectedId) actor.setSelected(true)
      }
      const p = this.layout.desks[a.id]
      if (p) actor.setDeskPosition(p.x, p.y)
      const dept = a.departmentId ? useDepartmentStore.getState().departmentsById[a.departmentId] : undefined
      actor.update(a, {
        accent: dept?.color ?? ORPHAN_DEPARTMENT.color,
        monitors: (dept && departmentConfig(dept.slug)?.monitorsPerDesk) || 1,
        hostLost,
        budgetBlocked: isBlockedAgent(useBudgetStore.getState().blocked, a.id),
        modelTag: modelTagOf(useModelStore.getState().key, a.id),
      })
    }
    for (const [id, actor] of this.actors) if (!agents[id]) { this.movement.remove(id); actor.destroy(); this.actors.delete(id) }

    this.syncDevices()
    this.dim()
    this.syncAttention()
    // Lần căn camera đầu tiên: đợi cả phòng lẫn agent đã tải để khung không bị sai kích thước
    if (!this.fitted && depts.length && all.length) { this.fitted = true; this.flyTo(this.focusId, 0) }
  }

  /** Đổi mức chi tiết khi zoom vượt ngưỡng (kiểm tra mỗi frame, chỉ tốn việc khi đổi). */
  private updateLod() {
    const far = this.world.scale.x < LOD_FAR_SCALE
    if (far === this.far) return
    this.far = far
    for (const a of this.actors.values()) a.setLod(far)
    for (const r of this.rooms.values()) r.setLod(far)
    for (const v of this.devices.values()) v.setLod(far)
  }

  private deviceKey() { return Object.values(useDeviceStore.getState().devicesById).map((d) => `${d.id}:${d.status}`).join('|') }

  /** Tạo/cập nhật/xoá hình thiết bị và cáp theo store. Vị trí lấy từ layout (chỉ phòng Hạ tầng có). */
  private syncDevices() {
    const { devicesById, links, selectedId } = useDeviceStore.getState()
    for (const [id, p] of Object.entries(this.layout.devices)) {
      const d = devicesById[id]
      if (!d) continue
      let v = this.devices.get(id)
      if (!v) {
        v = new DeviceView(d, (did) => this.handlers.onDeviceTap(did), () => this.camera.dragged)
        this.devices.set(id, v)
        this.deviceLayer.addChild(v)
        v.setLod(this.far)
        v.setSelected(id === selectedId)
      }
      v.position.set(p.x, p.y)
      v.update(d)
    }
    for (const [id, v] of this.devices) if (!this.layout.devices[id] || !devicesById[id]) { v.destroy({ children: true }); this.devices.delete(id) }
    this.cables.update(this.layout.devices, links)
  }

  /** Có cảnh báo mới: agent phụ trách đứng dậy đi tới thiết bị. Chỉ là hiệu ứng, không đổi trạng thái agent. */
  private inspect(deviceId: string) {
    const d = useDeviceStore.getState().devicesById[deviceId]
    const spot = this.nav?.places.device[deviceId]
    if (!d?.ownerAgentId || !spot) return
    this.movement.start(d.ownerAgentId, { to: spot, facing: 'up', dwellMs: 8000, label: `Đang kiểm tra ${d.name}`, priority: 1 })
  }

  /** Agent nào đang có yêu cầu chờ duyệt thì giơ tay + dấu chấm than; xong thì hạ tay. */
  private syncAttention() {
    const waiting = new Set(Object.values(useRealtimeStore.getState().approvals))
    for (const [id, actor] of this.actors) actor.character.setAttention(waiting.has(id))
  }

  /** Vẽ lại nét đứt ~8 lần/giây khi đang rê chuột vào người đang đi (không phải mỗi frame). */
  private updatePathPreview(dtMs: number) {
    if (!this.hoverId) return
    this.pathTick += dtMs
    if (this.pathTick < 120) return
    this.pathTick = 0
    const pts = this.movement.remainingPath(this.hoverId)
    if (pts) this.pathPreview.show(pts)
    else this.pathPreview.hide()
  }

  private alphaFor(deptId: string) { return this.focusId && deptId !== this.focusId ? DIM_ALPHA : 1 }

  /** Phòng khác phòng đang tập trung thì mờ đi; agent không khớp bộ lọc trạng thái cũng mờ. */
  private dim() {
    const filter = useUiStore.getState().statusFilter
    const agents = useAgentStore.getState().agentsById
    const matches = (id: string) => {
      const st = agents[id]?.status
      return filter === 'all' || (filter === 'WORKING' ? st === 'WORKING' : st === 'ERROR' || st === 'BLOCKED')
    }
    for (const [id, room] of this.rooms) room.alpha = this.alphaFor(id)
    this.deviceLayer.alpha = this.infraId ? this.alphaFor(this.infraId) : 1
    for (const [id, actor] of this.actors) actor.alpha = Math.min(this.alphaFor(this.deptOfAgent.get(id) ?? ''), matches(id) ? 1 : FILTER_ALPHA, this.lostHost.has(id) ? LOST_HOST_ALPHA : 1)
  }

  /** Trưởng phòng chia việc: vẽ đường nối sáng từ bàn trưởng phòng tới từng nhân viên được giao. */
  private spawnDispatch(d: Dispatch) {
    const from = this.layout.desks[d.headId]
    if (!from) return
    const color = useDepartmentStore.getState().departmentsById[d.departmentId]?.color ?? '#2563eb'
    const now = performance.now()
    d.targetAgentIds.forEach((id, i) => {
      const to = this.layout.desks[id]
      if (!to) return
      const fx = new DispatchEffect([from.x, from.y + 20], [to.x, to.y + 20], color, i % 2 ? 1 : -1, now, !this.reducedMotion)
      this.effects.push(fx)
      this.effectLayer.addChild(fx)
    })
  }

  /** Giao việc: đường nối cong từ người giao tới người nhận (kể cả khác phòng) + bong bóng ngắn ở đầu người giao. Bật/tắt ở thanh công cụ. */
  private spawnHandoff(e: Extract<MotionMessage, { type: 'task.handoff' }>) {
    if (!useSettingsStore.getState().showHandoff || e.fromAgentId === e.toAgentId) return
    const from = this.layout.desks[e.fromAgentId], to = this.layout.desks[e.toAgentId]
    if (!from || !to) return
    const giver = useAgentStore.getState().agentsById[e.fromAgentId]
    const color = useDepartmentStore.getState().departmentsById[giver?.departmentId ?? '']?.color ?? '#2563eb'
    const fx = new DispatchEffect([from.x, from.y + 20], [to.x, to.y + 20], color, 1, performance.now(), !this.reducedMotion)
    this.effects.push(fx)
    this.effectLayer.addChild(fx)
    if (e.message) this.actors.get(e.fromAgentId)?.character.say(e.message.length > 40 ? `${e.message.slice(0, 39)}…` : e.message)
  }

  /** Camera tới một phòng (hoặc toàn công ty nếu id = null). duration = 0 -> nhảy ngay. */
  private flyTo(id: string | null, duration: number) {
    const r = id ? this.layout.rooms[id] : this.layout.bounds
    if (r && r.w > 0) this.camera.fit(toBounds(r), duration)
  }

  private select(id: string | null) {
    if (this.selectedId) this.actors.get(this.selectedId)?.setSelected(false)
    this.selectedId = id
    if (id) this.actors.get(id)?.setSelected(true)
  }

  /** Nút "Về giữa": căn lại phòng đang xem (hoặc cả công ty). */
  resetCamera() { this.flyTo(this.focusId, 350) }

  destroy() {
    this.unsubscribes.forEach((f) => f())
    window.removeEventListener('keydown', this.onDevKey)
    window.removeEventListener('keydown', this.onStressKey)
    window.removeEventListener('keydown', this.onDemoKey)
    window.removeEventListener('keydown', this.onDebugKey)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.director.reset()
    if (this.wanderTimer) clearInterval(this.wanderTimer)
    this.app.canvas.removeEventListener('click', this.onDebugClick)
    this.resizeObserver.disconnect()
    this.motion.removeEventListener('change', this.onMotionChange)
    this.camera.destroy()
    this.app.destroy({ removeView: true }, { children: true })
  }
}
