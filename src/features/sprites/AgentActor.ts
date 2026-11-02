import { Container, Graphics, Rectangle } from 'pixi.js'
import { STATUS_STYLE } from '../../lib/statusColors.ts'
import type { Agent } from '../../types/index.ts'
import { Nameplate } from '../office/Nameplate.ts'
import { Bubble } from './Bubble.ts'
import { CharacterLayers } from './CharacterLayers.ts'
import { makeEmote } from './Emotes.ts'
import { CARRY_POS, EMOTE_POS, FRAME_H, LABEL, LOD_FAR_ZOOM, QUALITY, type Dir, type Quality } from './config.ts'
import { avatarOf } from './avatar.ts'
import { labelScale } from './labelLayout.ts'
import type { SpriteProvider } from './provider.ts'
import { hashId, reasonOf, resolvePose, viewOf, type PoseOverride, type PoseResult, type Reason } from './resolvePose.ts'

export interface ActorInput {
  agent: Agent
  accent: string // màu phòng (viền huy hiệu trưởng phòng)
  modelTag?: 'LOCAL' | 'CLOUD' | 'NONE' | null
  hostLost?: boolean
  budgetBlocked?: boolean
  waitingApproval?: boolean
  waitingDependency?: boolean
  /** Hướng ngồi, lấy từ SEAT.facing của bàn. */
  seatFacing: Dir
}
export interface ActorHandlers { onTap?: (id: string) => void; onOver?: () => void; onOut?: () => void; wasDragged?: () => boolean }

/**
 * Nhân vật trên canvas. Gốc (0,0) = chân (anchor 0.5,1).
 * Gồm: bóng, các lớp sprite, vật cầm, biểu tượng, nhãn (tên + vai trò + viên thuốc), bong bóng chat.
 * Trạng thái hiển thị (nhãn) cập nhật NGAY trong update(); hoạt ảnh chỉ phản ánh trạng thái.
 */
export class AgentActor extends Container {
  readonly agentId: string
  /** Kết quả tư thế gần nhất: scene dùng `screen`/`sparks`/`chairTilt` cho đồ vật quanh bàn. */
  pose: PoseResult = { anim: 'sit_idle', dir: 'down', icon: 'none', screen: 'idle', sparks: false, chairTilt: false }
  private provider: SpriteProvider
  private layers: CharacterLayers
  private shadow = new Graphics().ellipse(0, -1, 13, 5).fill({ color: '#0f172a', alpha: 0.18 })
  private carry = new Graphics()
  private emote: Container | null = null
  private emoteKind = 'none'
  private labelBox = new Container() // nhãn + nền đục (chữ luôn đạt tương phản AA trên mọi màu sàn)
  private plateBg = new Graphics()
  private plate = new Nameplate()
  private dot = new Graphics() // zoom xa: chỉ còn chấm trạng thái
  private bubble = new Bubble()
  private input: ActorInput | null = null
  private reason: Reason | undefined
  private override: PoseOverride | undefined
  private quality: Quality = 'medium'
  private reduced = false
  private zoom = 1
  private shift = 0
  private far = false
  private phase: number
  private slot = -1
  private idKey = ''
  private stKey = ''
  private lastDir: Dir = 'down'

  constructor(agentId: string, provider: SpriteProvider, h: ActorHandlers = {}) {
    super()
    this.agentId = agentId
    this.provider = provider
    this.phase = hashId(agentId) % 10000 // lệch pha để 20 người không gõ phím đồng bộ
    this.layers = new CharacterLayers(provider)
    this.labelBox.addChild(this.plateBg, this.plate)
    this.dot.visible = false
    this.addChild(this.shadow, this.layers, this.carry, this.labelBox, this.dot, this.bubble)
    this.carry.visible = false
    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.hitArea = new Rectangle(-16, -FRAME_H, 32, FRAME_H)
    this.on('pointerover', () => h.onOver?.())
    this.on('pointerout', () => h.onOut?.())
    this.on('pointertap', () => { if (!h.wasDragged?.()) h.onTap?.(agentId) })
    this.layoutLabel()
  }

  update(input: ActorInput) {
    const { agent } = input
    this.input = input
    this.reason = reasonOf({ hostLost: input.hostLost, budgetBlocked: input.budgetBlocked, noModel: input.modelTag === 'NONE' && !input.hostLost && !input.budgetBlocked, waitingApproval: input.waitingApproval, waitingDependency: input.waitingDependency })
    const view = viewOf(agent.status, agent.currentTask, this.reason)
    const idKey = `${agent.name}|${agent.role}|${agent.color}|${agent.isHead}|${input.accent}|${input.modelTag}`
    if (idKey !== this.idKey) {
      this.idKey = idKey
      this.plate.setIdentity(agent.name, agent.role, agent.color, input.modelTag === 'LOCAL' || input.modelTag === 'CLOUD' ? input.modelTag : null)
      this.plate.setHead(agent.isHead ? input.accent : null)
      this.redrawBackdrop()
    }
    const stKey = `${view.status}|${view.text}`
    if (stKey !== this.stKey) {
      this.stKey = stKey
      this.plate.setStatus(view.status, view.text)
      this.dot.clear().circle(0, -FRAME_H - 12, 14).fill(STATUS_STYLE[view.status].color).stroke({ width: 4, color: '#ffffff' })
      this.redrawBackdrop()
    }
    this.layers.setAvatar(avatarOf(agent))
    this.repose(performance.now())
  }

  /** Đi/đứng/nói/uống do bộ di chuyển điều khiển; undefined = quay về tư thế ngồi theo trạng thái. */
  setOverride(o: PoseOverride | undefined) {
    this.override = o
    this.repose(performance.now())
  }

  setCarry(kind: 'none' | 'paper' | 'cup') {
    this.carry.visible = kind !== 'none'
    this.carry.clear()
    if (kind === 'paper') this.carry.roundRect(0, 0, 9, 12, 1.5).fill('#ffffff').stroke({ width: 1, color: '#94a3b8' })
    if (kind === 'cup') this.carry.roundRect(0, 0, 8, 9, 2).fill('#92400e').rect(0, 2, 8, 2).fill('#fef3c7')
    this.placeCarry()
  }

  setQuality(q: Quality) { this.quality = q; this.shadow.visible = QUALITY[q].shadow }
  setReducedMotion(v: boolean) { this.reduced = v }

  /** Zoom của camera: quyết định cỡ nhãn và chế độ chấm trạng thái. */
  setZoom(zoom: number) {
    this.zoom = zoom
    const far = zoom < LOD_FAR_ZOOM
    this.far = far
    this.labelBox.visible = !far
    this.dot.visible = far
    if (far) this.bubble.visible = false
    this.layoutLabel()
  }

  /** Đẩy nhãn lên (px thế giới) để tránh nhãn khác; xem avoidOverlaps. */
  setLabelShift(dy: number) { this.shift = dy; this.layoutLabel() }

  /** Hình chữ nhật nhãn trong toạ độ thế giới (chưa tính độ đẩy), để tính tránh chồng. */
  labelRect() {
    const b = this.plate.getLocalBounds()
    const s = this.labelBox.scale.x
    const w = (b.width + 12) * s
    return { x: this.x, y: this.y + this.labelBox.y - this.shift, w, h: (Nameplate.HEIGHT + 6) * s }
  }

  say(text: string, now = performance.now()) {
    this.bubble.say(text, now)
    this.bubble.visible = !this.far
  }

  /** Mỗi frame. `inView=false` + chất lượng thấp => bỏ qua (chỉ agent trong khung nhìn mới chạy hoạt ảnh). */
  animate(now: number, inView = true) {
    const q = QUALITY[this.quality]
    if (!inView && !q.animateOffscreen) return
    const slot = Math.floor(now / 4000)
    if (slot !== this.slot && this.pose.anim === 'sit_idle') this.repose(now) // thỉnh thoảng nhìn quanh
    this.layers.tick(now + this.phase, q.fpsScale, this.reduced)
    if (this.emote) this.emote.y = EMOTE_POS.y + (this.reduced ? 0 : Math.sin((now + this.phase) / 260) * 2)
    this.bubble.tick(now)
  }

  private repose(now: number) {
    const input = this.input
    if (!input) return
    this.slot = Math.floor(now / 4000)
    const next = resolvePose({ id: this.agentId, status: input.agent.status, reason: this.reason, seatFacing: input.seatFacing, nowMs: now, has: (a) => this.provider.hasAnim(a), override: this.override })
    this.pose = next
    this.lastDir = next.dir
    const q = QUALITY[this.quality]
    this.layers.play(next.anim, next.dir, this.reduced ? 0 : q.crossfadeMs, now + this.phase)
    this.setEmote(next.icon)
    this.placeCarry()
  }

  private setEmote(kind: PoseResult['icon']) {
    if (kind === this.emoteKind) return
    this.emoteKind = kind
    this.emote?.destroy({ children: true })
    this.emote = kind === 'none' ? null : makeEmote(kind)
    if (this.emote) { this.emote.position.set(EMOTE_POS.x, EMOTE_POS.y); this.addChild(this.emote) }
  }

  private placeCarry() { this.carry.position.set(this.lastDir === 'left' ? -CARRY_POS.x - this.carry.width : CARRY_POS.x, CARRY_POS.y) }

  private redrawBackdrop() {
    const b = this.plate.getLocalBounds()
    this.plateBg.clear().roundRect(b.x - 6, b.y - 3, b.width + 12, b.height + 6, 10).fill({ color: '#ffffff', alpha: 0.9 })
  }

  private layoutLabel() {
    const s = labelScale(this.zoom)
    this.labelBox.scale.set(s)
    this.labelBox.y = -FRAME_H - LABEL.gap - Nameplate.HEIGHT * s - this.shift
    this.bubble.scale.set(s)
    this.bubble.y = this.labelBox.y - 8 * s
  }
}
