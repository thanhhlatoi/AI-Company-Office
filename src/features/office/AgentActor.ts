import type { Agent } from '../../types'
import { AgentCharacter, type Facing, type Pose } from './AgentCharacter'
import { DeskView, type Look } from './DeskView'

/**
 * Một agent trên canvas = bàn (DeskView, đứng yên) + người (AgentCharacter, có thể đi lại).
 * Hai phần nằm ở hai lớp khác nhau trong scene để người đi ngang qua bàn khác vẫn hiện trên cùng.
 */
export class AgentActor {
  readonly agentId: string
  readonly desk: DeskView
  readonly character: AgentCharacter
  private hovered = false
  private selected = false

  constructor(agentId: string, onTap: (id: string) => void, wasDragged: () => boolean) {
    this.agentId = agentId
    this.desk = new DeskView(agentId)
    // hover/tap trên bàn hay trên người đều tính là chạm vào agent
    const over = () => { this.hovered = true; this.refresh() }
    const out = () => { this.hovered = false; this.refresh() }
    this.character = new AgentCharacter(agentId, over, out, onTap, wasDragged)
    this.desk.on('pointerover', over)
    this.desk.on('pointerout', out)
    this.desk.on('pointertap', () => { if (!wasDragged()) onTap(agentId) })
  }

  update(a: Agent, look: Look) {
    this.desk.update(a, look)
    this.desk.setWorking(a.status === 'WORKING' && !look.hostLost && !look.budgetBlocked)
    this.character.update(a, look)
  }

  /** Đặt bàn; người đang ngồi thì đi theo chỗ ngồi (người đang đi thì do bộ di chuyển điều khiển). */
  setDeskPosition(x: number, y: number) {
    this.desk.position.set(x, y)
    if (this.character.pose === 'SEATED') this.character.position.set(x + this.desk.seatPoint.x, y + this.desk.seatPoint.y)
  }

  /** Đổi tư thế; rời ghế thì màn hình chuyển sang chế độ chờ. */
  setPose(pose: Pose, facing: Facing) {
    this.character.setPose(pose, facing)
    this.desk.setSeatEmpty(pose !== 'SEATED')
  }

  setLod(far: boolean) { this.character.setLod(far) }
  set alpha(v: number) { this.desk.alpha = v; this.character.alpha = v }
  setSelected(v: boolean) { this.selected = v; this.refresh() }
  animate(now: number) { this.desk.animate(now); this.character.animate(now) }
  destroy() { this.desk.destroy({ children: true }); this.character.destroy({ children: true }) }

  private refresh() { this.desk.setHighlight(this.hovered, this.selected) }
}
