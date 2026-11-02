import type { AgentStatus } from '../../types/index.ts'
import { statusLabel } from '../../lib/statusColors.ts'
import { ANIM_FALLBACK, POSE, type AnimName, type Dir } from './config.ts'

/** Lý do chặn (ưu tiên từ trên xuống): máy chủ mất > hết ngân sách > không model > chờ duyệt > chờ phụ thuộc. */
export type Reason = 'host' | 'budget' | 'nomodel' | 'approval' | 'dependency'
export type Icon = 'none' | 'alert' | 'coin' | 'error' | 'zzz'
export type ScreenState = 'off' | 'idle' | 'working' | 'error'
export interface PoseOverride { anim: AnimName; dir?: Dir }

export interface PoseInput {
  id: string
  status: AgentStatus
  reason?: Reason
  seatFacing: Dir
  nowMs: number
  /** Có hình thật cho hoạt ảnh này không (để lùi mức B về mức A). */
  has: (anim: string) => boolean
  /** Đi/đứng/nói chuyện/uống (do bộ di chuyển 5C điều khiển) ghi đè tư thế ngồi. */
  override?: PoseOverride
}
export interface PoseResult { anim: AnimName; dir: Dir; icon: Icon; screen: ScreenState; sparks: boolean; chairTilt: boolean }

export function hashId(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function reasonOf(f: { hostLost?: boolean; budgetBlocked?: boolean; noModel?: boolean; waitingApproval?: boolean; waitingDependency?: boolean }): Reason | undefined {
  return f.hostLost ? 'host' : f.budgetBlocked ? 'budget' : f.noModel ? 'nomodel' : f.waitingApproval ? 'approval' : f.waitingDependency ? 'dependency' : undefined
}

/** Trạng thái hiển thị (màu viên thuốc) và chữ; cập nhật ngay, không phụ thuộc hoạt ảnh. */
export function viewOf(status: AgentStatus, task: { title: string } | null, reason?: Reason): { status: AgentStatus; text: string } {
  switch (reason) {
    case 'host': return { status: 'OFFLINE', text: 'Mất máy chủ' }
    case 'budget': return { status: 'BLOCKED', text: 'Hết ngân sách' }
    case 'nomodel': return { status: 'BLOCKED', text: 'Không có model' }
    case 'approval': return { status: 'BLOCKED', text: 'Chờ duyệt' }
    case 'dependency': return { status, text: 'Chờ phụ thuộc' }
    default: return { status, text: statusLabel(status, task) }
  }
}

const pick = (a: AnimName, has: (anim: string) => boolean): AnimName => {
  let x = a
  for (let next = ANIM_FALLBACK[x]; !has(x) && next; next = ANIM_FALLBACK[x]) x = next
  return x
}

/** Thỉnh thoảng ngẩng nhìn sang bên (xác định theo id + lượt thời gian, mọi người không nhìn cùng lúc). */
export function idleLook(id: string, nowMs: number, facing: Dir): Dir {
  const h = hashId(`${id}:${Math.floor(nowMs / POSE.idleSlotMs)}`)
  if ((h % 1000) / 1000 >= POSE.idleLookChance) return facing
  const side: Dir[] = facing === 'left' || facing === 'right' ? ['down'] : ['left', 'right']
  return side[(h >> 10) % side.length]
}

/** Hàm thuần: trạng thái agent -> hoạt ảnh + hướng + biểu tượng + trạng thái màn hình. */
export function resolvePose(i: PoseInput): PoseResult {
  const out: PoseResult = { anim: 'sit_idle', dir: i.seatFacing, icon: 'none', screen: 'idle', sparks: false, chairTilt: false }
  if (i.override) return { ...out, anim: pick(i.override.anim, i.has), dir: i.override.dir ?? i.seatFacing, screen: 'off' } // rời ghế
  const status = viewOf(i.status, null, i.reason).status
  switch (status) {
    case 'OFFLINE': return { ...out, anim: 'sit_sleep', icon: 'zzz', screen: 'off', chairTilt: true }
    case 'ERROR': {
      const anim = pick('sit_error', i.has)
      const hasB = anim === 'sit_error' // mức A: sit_hand + biểu tượng đỏ; mức B: tia lửa trên màn hình
      return { ...out, anim, icon: hasB ? 'none' : 'error', screen: 'error', sparks: hasB }
    }
    case 'BLOCKED': return { ...out, anim: 'sit_hand', icon: i.reason === 'budget' ? 'coin' : 'alert' }
    case 'WORKING': return { ...out, anim: 'sit_type', screen: 'working' }
    default:
      if (i.reason === 'dependency') return { ...out, anim: pick('sit_think', i.has) }
      return { ...out, dir: idleLook(i.id, i.nowMs, i.seatFacing) }
  }
}

/** Khung hiện tại. Mỗi agent lệch pha riêng (nowMs đã cộng pha) nên 20 người không gõ phím đồng bộ. */
export function frameIndex(anim: string, n: number, fps: number, nowMs: number, reduced: boolean): number {
  let count = n
  let rate = fps
  if (reduced) {
    if (anim === 'walk') return 0 // không hoạt ảnh bước
    if (anim === 'sit_type') { count = Math.min(n, 2); rate = 1 } // gõ phím: hai khung chậm
  }
  return count <= 1 ? 0 : Math.floor((nowMs / 1000) * rate) % count
}
