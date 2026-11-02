import { Container, Graphics, Rectangle, Text } from 'pixi.js'
import { STATUS_STYLE, statusLabel } from '../../lib/statusColors'
import type { Agent } from '../../types'
import type { Look } from './DeskView'
import { Nameplate } from './Nameplate'

export type Pose = 'SEATED' | 'STANDING' | 'WALKING'
export type Facing = 'up' | 'down' | 'left' | 'right'

const SKIN = '#f2c9a0'
const HAIR = '#3b2a20'
const SHOE = '#334155'
const EYE = '#1e293b'

/**
 * Chỉ vẽ NGƯỜI (đầu, thân, tay, chân) + nhãn tên và viên thuốc trạng thái đi theo người.
 * Gốc (0,0) = chỗ ngồi: giữa đáy thân. Muốn dùng sprite sheet: thay phần vẽ trong class này,
 * giữ nguyên setPose / setShirt / animate để phần còn lại không phải sửa.
 */
export class AgentCharacter extends Container {
  readonly agentId: string
  pose: Pose = 'SEATED'
  facing: Facing = 'down'
  private plate = new Nameplate()
  private dot = new Graphics() // thay nhãn khi zoom xa: chỉ còn chấm màu trạng thái
  private figure = new Container() // thân người: nhấp nhô khi đi / gõ phím
  private body = new Graphics()
  private head = new Graphics()
  private handL = new Graphics().circle(0, 0, 4).fill(SKIN)
  private handR = new Graphics().circle(0, 0, 4).fill(SKIN)
  private footL = new Graphics().roundRect(-5, 0, 10, 6, 3).fill(SHOE)
  private footR = new Graphics().roundRect(-5, 0, 10, 6, 3).fill(SHOE)
  private working = false
  private walkDistance = 0 // quãng đường đã đi: nhịp bước theo quãng đường nên chân không trượt
  private statusOverride: string | null = null
  private attention = false // đang chờ chủ duyệt: giơ tay + dấu chấm than
  private away = false // đang ngồi ở chỗ khác (phòng họp): không gõ phím
  private bubbleUntil = 0
  private bubble = new Container()
  private bubbleBg = new Graphics()
  private bubbleText = new Text({ text: '', resolution: 3, style: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: '600', fill: '#0f172a', wordWrap: true, wordWrapWidth: 170, align: 'center' } })
  private alert = new Graphics().circle(0, 0, 10).fill('#f59e0b').stroke({ width: 2, color: '#ffffff' }).roundRect(-1.6, -6, 3.2, 7, 1.4).fill('#ffffff').circle(0, 4.5, 1.8).fill('#ffffff')
  private far = false
  private lastAgent: Agent | null = null
  private lastLook: Look | null = null
  private paper = new Graphics().roundRect(0, 0, 12, 15, 2).fill('#ffffff').stroke({ width: 1, color: '#94a3b8' }).rect(2, 4, 8, 1.5).fill('#94a3b8').rect(2, 8, 8, 1.5).fill('#94a3b8').rect(2, 12, 5, 1.5).fill('#94a3b8')
  private phase = 0 // lệch pha để các agent không gõ đồng loạt
  private headKey = ''
  private identityKey = ''
  private statusKey = ''

  constructor(agentId: string, onOver: () => void, onOut: () => void, onTap: (id: string) => void, wasDragged: () => boolean) {
    super()
    this.agentId = agentId
    this.phase = [...agentId].reduce((n, c) => n + c.charCodeAt(0), 0) * 97
    this.figure.addChild(this.footL, this.footR, this.body, this.head, this.handL, this.handR, this.paper)
    this.paper.visible = false
    this.plate.y = -107
    this.dot.visible = false
    this.alert.visible = false
    this.alert.position.set(26, -58)
    this.bubbleText.anchor.set(0.5, 1)
    this.bubble.visible = false
    this.bubble.addChild(this.bubbleBg, this.bubbleText)
    this.bubble.y = -122 // phía trên nhãn tên + viên thuốc, không chồng lên chúng
    this.addChild(this.figure, this.plate, this.dot, this.alert, this.bubble)
    this.applyPose()

    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.hitArea = new Rectangle(-22, -56, 44, 68)
    this.on('pointerover', onOver)
    this.on('pointerout', onOut)
    this.on('pointertap', () => { if (!wasDragged()) onTap(agentId) })
  }

  update(a: Agent, look: Look) {
    const idKey = `${a.name}|${a.role}|${a.color}|${a.isHead}|${look.accent}|${look.modelTag}`
    if (idKey !== this.identityKey) {
      this.identityKey = idKey
      this.body.clear().roundRect(-18, -28, 36, 28, 10).fill(a.color) // áo
      this.plate.setIdentity(a.name, a.role, a.color, look.modelTag === 'LOCAL' || look.modelTag === 'CLOUD' ? look.modelTag : null)
      this.plate.setHead(a.isHead ? look.accent : null)
    }
    this.lastAgent = a
    this.lastLook = look
    const lost = !!look.hostLost // máy chủ OFFLINE: xám "Mất máy chủ", không gõ phím
    const broke = !!look.budgetBlocked && !lost // hết ngân sách: đỏ "Hết ngân sách", không gõ phím
    const noModel = look.modelTag === 'NONE' && !lost && !broke // không có model hợp lệ: đỏ, task sẽ chờ
    const status = lost ? 'OFFLINE' : broke || noModel ? 'BLOCKED' : this.attention ? 'BLOCKED' : a.status // chờ duyệt hiện màu đỏ như bị chặn
    const text = this.statusOverride ?? (lost ? 'Mất máy chủ' : broke ? 'Hết ngân sách' : noModel ? 'Không có model' : this.attention ? 'Chờ duyệt' : statusLabel(a.status, a.currentTask))
    const stKey = `${status}|${text}`
    if (stKey !== this.statusKey) {
      this.statusKey = stKey
      this.plate.setStatus(status, text)
      this.working = a.status === 'WORKING' && !lost && !broke && !noModel
      if (!this.working && this.pose === 'SEATED') this.applyPose() // về tư thế nghỉ
      this.dot.clear().circle(0, -74, 17).fill(STATUS_STYLE[status].color).stroke({ width: 4, color: '#ffffff' })
    }
  }

  /** Viên thuốc hiển thị việc đang đi ("Đang đi giao việc"...) thay cho trạng thái agent; null = trả lại như cũ. */
  setStatusOverride(text: string | null) {
    if (text === this.statusOverride) return
    this.statusOverride = text
    this.statusKey = '' // buộc vẽ lại viên thuốc
    if (this.lastAgent && this.lastLook) this.update(this.lastAgent, this.lastLook)
  }

  /** Chờ chủ duyệt: giơ tay vẫy + dấu chấm than, viên thuốc "Chờ duyệt" (màu đỏ). */
  setAttention(v: boolean) {
    if (v === this.attention) return
    this.attention = v
    this.alert.visible = v && !this.far
    this.statusKey = ''
    if (!v) this.applyPose() // hạ tay
    if (this.lastAgent && this.lastLook) this.update(this.lastAgent, this.lastLook)
  }

  /** Đang ngồi ở chỗ khác (họp): không gõ phím dù agent đang làm. */
  setAway(v: boolean) { this.away = v }

  /** Bong bóng chat ngắn phía trên nhãn, tự biến mất sau 3 giây. */
  say(text: string, now = performance.now()) {
    const t = text.length > 90 ? `${text.slice(0, 89)}…` : text
    this.bubbleText.text = t
    const w = Math.max(60, this.bubbleText.width + 20), h = this.bubbleText.height + 14
    this.bubbleText.position.set(0, -10)
    this.bubbleBg.clear()
      .roundRect(-w / 2, -h - 10, w, h, 12).fill({ color: '#ffffff', alpha: 0.97 }).stroke({ width: 1.5, color: '#94a3b8' })
      .poly([-7, -10.5, 7, -10.5, 0, 0]).fill('#ffffff') // đuôi bong bóng chỉ xuống người nói
    this.bubbleUntil = now + 3000
    this.bubble.alpha = 1
    this.bubble.visible = !this.far
  }

  /** Cầm tập giấy trên tay (đi giao việc). */
  setCarry(v: boolean) { this.paper.visible = v }

  /** Làm mờ thân người (chế độ giảm chuyển động: biến mất rồi hiện ở nơi khác). Nhãn giữ nguyên. */
  setFade(v: number) { this.figure.alpha = v }

  /** Quãng đường đã đi (px); chân đổi bước theo giá trị này. */
  setWalkDistance(d: number) { this.walkDistance = d }

  setPose(pose: Pose, facing: Facing) {
    if (pose === this.pose && facing === this.facing) return
    this.pose = pose
    this.facing = facing
    this.applyPose()
  }

  /** Mức chi tiết theo zoom: xa -> chỉ chấm trạng thái, gần -> nhãn đầy đủ. */
  setLod(far: boolean) {
    this.far = far
    this.plate.visible = !far
    this.dot.visible = far
    this.alert.visible = this.attention && !far
    this.bubble.visible = !far && performance.now() < this.bubbleUntil
  }

  private applyPose() {
    const seated = this.pose === 'SEATED'
    this.footL.visible = this.footR.visible = !seated // ngồi thì chân khuất dưới bàn
    this.footL.position.set(-8, 4)
    this.footR.position.set(8, 4)
    // ngồi: tay đặt lên bàn; đứng: tay buông hai bên
    this.handL.position.set(seated ? -10 : -22, seated ? 4 : -10)
    this.handR.position.set(seated ? 10 : 22, seated ? 4 : -10)
    this.paper.position.set(18, seated ? -2 : -16) // tập giấy trên tay phải
    this.figure.y = 0
    this.drawHead()
  }

  /** Đầu theo hướng nhìn: xuống = thấy mặt, lên = thấy gáy (tóc), trái/phải = nhìn nghiêng. */
  private drawHead() {
    const key = this.facing
    if (key === this.headKey) return
    this.headKey = key
    const h = this.head.clear().circle(0, -40, 11).fill(SKIN)
    if (key === 'down') {
      h.ellipse(0, -46, 11, 6).fill(HAIR).circle(-4, -39, 1.5).fill(EYE).circle(4, -39, 1.5).fill(EYE)
    } else if (key === 'up') {
      h.circle(0, -40, 11).fill(HAIR)
    } else {
      const s = key === 'left' ? -1 : 1
      h.ellipse(-s * 4, -42, 8, 9).fill(HAIR).circle(s * 5, -39, 1.5).fill(EYE)
    }
  }

  /** Gõ phím: hai tay nhấp lên xuống luân phiên, thân nhún vài px. */
  private typing(t: number) {
    this.handL.y = 4 + Math.sin(t / 70) * 2.5
    this.handR.y = 4 + Math.sin(t / 70 + Math.PI) * 2.5
    this.figure.y = Math.sin(t / 140) * 0.8
  }

  /** Đi bộ: chân đổi bước, tay vung, thân nhấp nhô; nhịp bước theo quãng đường đã đi (28px / nửa chu kỳ). */
  private walking(distance: number) {
    const s = Math.sin(distance / 9)
    const sideways = this.facing === 'left' || this.facing === 'right'
    // quay mặt dọc (lên/xuống): chân bước theo trục y; nhìn ngang: bước theo trục x
    if (sideways) { this.footL.position.set(-3 + s * 6, 4); this.footR.position.set(3 - s * 6, 4) }
    else { this.footL.position.set(-8, 4 + s * 4); this.footR.position.set(8, 4 - s * 4) }
    this.handL.y = -10 - s * 3
    this.handR.y = -10 + s * 3
    this.figure.y = -Math.abs(s) * 2
  }

  /** Gọi mỗi frame (ticker). Chỉ vẽ lại vị trí/biến đổi, không tạo lại Graphics. */
  animate(now: number) {
    if (this.bubble.visible) {
      const left = this.bubbleUntil - now
      if (left <= 0) this.bubble.visible = false
      else this.bubble.alpha = Math.min(1, left / 400) // mờ dần trong 0.4s cuối
    }
    if (this.attention) {
      const t = now + this.phase
      this.alert.y = -58 + Math.sin(t / 220) * 2
      if (this.pose === 'SEATED') { // tay phải giơ lên và vẫy
        this.handR.position.set(18, -34 + Math.sin(t / 130) * 3)
        return
      }
    }
    if (this.pose === 'WALKING') this.walking(this.walkDistance)
    else if (this.pose === 'SEATED' && this.working && !this.away) this.typing(now + this.phase)
  }
}
