import type { Agent, Department, MotionMessage } from '../../../types'
import type { AgentActor } from '../AgentActor'
import type { Facing } from '../AgentCharacter'
import type { NavMap } from '../nav/buildNav'
import type { Point } from '../nav/NavGrid'
import type { MovementSystem } from './MovementSystem'

interface Deps {
  movement: MovementSystem
  nav: () => NavMap | null
  actor: (id: string) => AgentActor | undefined
  agents: () => Record<string, Agent>
  departments: () => Record<string, Department>
  /** agent đang có yêu cầu chờ duyệt (không cho đi lại ngẫu nhiên) */
  hasApproval: (id: string) => boolean
}

const facingTo = (from: Point, to: Point): Facing =>
  Math.abs(to.x - from.x) > Math.abs(to.y - from.y) ? (to.x < from.x ? 'left' : 'right') : to.y < from.y ? 'up' : 'down'

/**
 * Biến sự kiện hệ thống thành hành trình của nhân vật. Mọi di chuyển đều bắt nguồn từ đây (không có đi ngẫu nhiên).
 * Chỉ là hiệu ứng: không đổi trạng thái agent (trạng thái thật do BE gửi).
 */
export class MotionDirector {
  private d: Deps
  private meetings = new Map<string, { ids: string[]; timer: ReturnType<typeof setTimeout> | null }>()
  private seatTaken = new Map<number, string>() // số ghế họp -> agent

  constructor(deps: Deps) { this.d = deps }

  handle(e: MotionMessage) {
    switch (e.type) {
      case 'task.handoff': return this.handoff(e.fromAgentId, e.toAgentId, e.message)
      case 'report.to_head': return this.report(e.agentId, e.departmentId)
      case 'meeting.started': return this.startMeeting(e.departmentId, e.agentIds, e.endsAt ?? null)
      case 'meeting.ended': return this.endMeeting(e.departmentId)
    }
  }

  private nameOf(id: string) { return this.d.agents()[id]?.name ?? 'đồng nghiệp' }

  /**
   * Đi lại ngẫu nhiên khi rảnh (CHỈ khi bật trong Cài đặt): một agent đang rảnh đi pha cà phê hoặc ghé bàn đồng nghiệp cùng phòng.
   * Tối đa 2 người cùng lúc; mọi chữ trên viên thuốc đều có "(mô phỏng)" để không nhầm với việc thật.
   */
  wander(random: () => number = Math.random) {
    const { movement } = this.d
    const places = this.d.nav()?.places
    if (!places || movement.simulatedCount() >= 2) return
    const agents = this.d.agents()
    const idle = Object.values(agents).filter((a) => a.status === 'IDLE' && this.d.actor(a.id) && movement.stateOf(a.id) === 'SEATED' && !this.d.hasApproval(a.id) && places.seat[a.id])
    if (!idle.length) return
    const a = idle[Math.floor(random() * idle.length)]
    const mates = Object.values(agents).filter((o) => o.id !== a.id && o.departmentId === a.departmentId && places.visit[o.id])
    if (mates.length && random() < 0.5) {
      const mate = mates[Math.floor(random() * mates.length)]
      movement.start(a.id, { to: places.visit[mate.id], queueAt: mate.id, facing: 'left', dwellMs: 3500, label: 'Trò chuyện (mô phỏng)', destName: `bàn ${mate.name}`, simulated: true })
    } else {
      movement.start(a.id, { to: places.coffee, facing: 'up', dwellMs: 3500, label: 'Pha cà phê (mô phỏng)', destName: 'quầy cà phê', simulated: true })
    }
  }

  /** Mở lại tab / bố cục đổi: mọi người đã về chỗ nên quên các cuộc họp đang diễn ra. */
  reset() {
    for (const m of this.meetings.values()) if (m.timer) clearTimeout(m.timer)
    this.meetings.clear()
    this.seatTaken.clear()
  }

  // Người giao đứng dậy, cầm tập giấy, tới ô đứng cạnh bàn người nhận, nói một câu rồi về. Người nhận quay sang nhìn.
  private handoff(fromId: string, toId: string, message: string) {
    const visit = this.d.nav()?.places.visit[toId]
    const receiver = this.d.actor(toId)
    if (!visit || fromId === toId || !this.d.actor(fromId)) return
    const turn = (face: Facing) => { if (receiver && this.d.movement.stateOf(toId) === 'SEATED') receiver.setPose('SEATED', face) }
    this.d.movement.start(fromId, {
      to: visit, queueAt: toId, facing: 'left', dwellMs: 3200, carry: true, label: 'Đang đi giao việc', destName: `bàn ${this.nameOf(toId)}`,
      onArrive: () => { turn('right'); if (message) this.d.actor(fromId)?.character.say(message) },
      onLeave: () => turn('down'),
    })
  }

  // Nhân viên tới bàn trưởng phòng báo cáo rồi về.
  private report(agentId: string, departmentId: string) {
    const headId = this.d.departments()[departmentId]?.headAgentId
    const visit = this.d.nav()?.places.headDesk[departmentId]
    const head = headId ? this.d.actor(headId) : undefined
    if (!headId || !visit || headId === agentId || !this.d.actor(agentId)) return
    const turn = (face: Facing) => { if (head && this.d.movement.stateOf(headId) === 'SEATED') head.setPose('SEATED', face) }
    this.d.movement.start(agentId, {
      to: visit, queueAt: headId, facing: 'left', dwellMs: 3000, carry: true, label: 'Đang báo cáo', destName: `bàn trưởng phòng ${this.nameOf(headId)}`,
      onArrive: () => { turn('right'); this.d.actor(agentId)?.character.say('Mình báo cáo: đã xong việc.') },
      onLeave: () => turn('down'),
    })
  }

  // Các agent được mời vào phòng họp ở Khu chung, ngồi quanh bàn tròn tới khi họp xong.
  private startMeeting(departmentId: string, agentIds: string[], endsAt: string | null) {
    const places = this.d.nav()?.places
    if (!places?.meetingSeats.length || this.meetings.has(departmentId)) return
    const mc = places.meetingCenter
    const attendees: string[] = []
    for (const id of agentIds) {
      const seat = [...places.meetingSeats.keys()].find((i) => !this.seatTaken.has(i)) // ghế còn trống đầu tiên
      if (seat === undefined || !this.d.actor(id)) continue
      this.seatTaken.set(seat, id)
      attendees.push(id)
      const at = places.meetingSeats[seat]
      const out = Math.hypot(at.x - mc.x, at.y - mc.y) || 1
      const approach = { x: at.x + ((at.x - mc.x) / out) * 52, y: at.y + ((at.y - mc.y) / out) * 52 }
      this.d.movement.start(id, {
        to: at, approach, facing: facingTo(at, mc), dwellMs: 0, hold: true, sit: true, label: 'Đang họp', destName: 'phòng họp',
        onLeave: () => { if (this.seatTaken.get(seat) === id) this.seatTaken.delete(seat) },
        onAbort: () => { if (this.seatTaken.get(seat) === id) this.seatTaken.delete(seat) },
      })
    }
    if (!attendees.length) return
    // endsAt theo đồng hồ máy chủ: chỉ dùng làm hẹn giờ dự phòng (1 giây .. 10 phút); sự kiện meeting.ended vẫn là chính
    const wait = endsAt ? Math.min(600_000, Math.max(1000, Date.parse(endsAt) - Date.now())) : null
    const timer = wait === null || Number.isNaN(wait) ? null : setTimeout(() => this.endMeeting(departmentId), wait)
    this.meetings.set(departmentId, { ids: attendees, timer })
  }

  private endMeeting(departmentId: string) {
    const m = this.meetings.get(departmentId)
    if (!m) return
    if (m.timer) clearTimeout(m.timer)
    this.meetings.delete(departmentId)
    for (const id of m.ids) this.d.movement.release(id) // hết họp: về chỗ
  }
}
