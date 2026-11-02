import { COMMON_AREA, INFRA_SLUG } from '../../config/departments'
import type { Agent, Department } from '../../types'

export interface Rect { x: number; y: number; w: number; h: number }
export interface OfficeLayout {
  rooms: Record<string, Rect>
  /** thảm dưới khu nhân viên, toạ độ tương đối so với phòng (null nếu phòng chưa có nhân viên) */
  rugs: Record<string, Rect | null>
  desks: Record<string, { x: number; y: number }>
  /** thiết bị (phòng Hạ tầng): toạ độ thế giới của giữa đáy thiết bị */
  devices: Record<string, { x: number; y: number }>
  /** khung bao toàn bộ các phòng */
  bounds: Rect
}

// Kích thước (đơn vị thế giới). Bàn nhân viên rộng 120; nhãn phía trên cao ~117.
const PITCH_X = 250
const PITCH_Y = 210
const PAD_X = 90
const MIN_W = 640 // đủ chỗ cho đồ trang trí hai bên khu trưởng phòng
const TITLE_H = 90 // vùng biển tên phòng ở đầu phòng
const HEAD_Y = TITLE_H + 150 // bàn trưởng phòng (tính từ đỉnh phòng)
const STAFF_Y = HEAD_Y + 230 // hàng nhân viên đầu tiên
const ROOMS_PER_ROW = 3
const ROOM_GAP = 140 // hành lang giữa các phòng (đi được)
const BOTTOM_PAD = 130 // dưới hàng bàn cuối: chừa lối đi tới cửa dưới
// Khu thiết bị của phòng Hạ tầng: một hàng, chừa lối đi giữa (tới cửa dưới); cáp chạy dọc phía dưới hàng
export const DEVICE_FOOT = { w: 112, h: 96 } // vùng chiếm chỗ của một thiết bị (cản đường đi)
const DEV_PITCH = 170
const DEV_AISLE = 160
const DEV_PAD = 60
const DEV_ZONE_H = 300
const DEV_BASE_OFFSET = 110 // đáy thiết bị cách đáy khu bàn nhân viên (baseH) từng này
const COMMON_W = 1000
const COMMON_H = 400

/** Agent chưa thuộc phòng nào được gom vào phòng giả này để không bị biến mất khỏi canvas. */
export const ORPHAN_DEPARTMENT: Department = {
  id: '', name: 'Chưa phân phòng', slug: 'chua-phan-phong', icon: 'building', color: '#64748b', headAgentId: null, order: 9999,
}

/** Khu chung: không phải phòng ban, chỉ là khối cuối bản đồ (phòng họp, cà phê, chờ duyệt). */
export const COMMON_ID = 'common'
export const COMMON_DEPARTMENT: Department = {
  id: COMMON_ID, name: COMMON_AREA.name, slug: COMMON_AREA.slug, icon: 'building', color: COMMON_AREA.color, headAgentId: null, order: 10000,
}

/**
 * Xếp phòng và bàn hoàn toàn tự động (không dùng toạ độ từ BE):
 * trưởng phòng ở giữa đầu phòng, nhân viên chia hai hàng bên dưới, kích thước phòng theo số nhân viên.
 * Phòng xếp theo `order`, 3 phòng mỗi hàng, mỗi hàng căn giữa.
 * `agentsByDept[deptId]` đã có trưởng phòng đứng đầu (xem store/selectors.ts).
 */
export function computeLayout(departments: Department[], agentsByDept: Record<string, Agent[]>, deviceIds: string[] = []): OfficeLayout {
  const sorted = departments.filter((d) => d.id !== COMMON_ID).sort((a, b) => a.order - b.order)
  const sized = sorted.map((dept) => {
    const members = agentsByDept[dept.id] ?? []
    const head = members.find((a) => a.isHead)
    const staff = members.filter((a) => a !== head)
    const cols = Math.ceil(staff.length / 2)
    const rows = staff.length > cols ? 2 : staff.length > 0 ? 1 : 0
    const nDev = dept.slug === INFRA_SLUG ? deviceIds.length : 0
    const side = Math.ceil(nDev / 2)
    const w = Math.max(MIN_W, cols * PITCH_X + 2 * PAD_X, nDev ? 2 * DEV_PAD + DEV_AISLE + 2 * side * DEV_PITCH : 0)
    const baseH = rows ? STAFF_Y + (rows - 1) * PITCH_Y + 48 + BOTTOM_PAD : HEAD_Y + 70 + BOTTOM_PAD
    return { dept, head, staff, cols, w, baseH, devices: nDev ? deviceIds : [], h: baseH + (nDev ? DEV_ZONE_H : 0) }
  })

  const rooms: Record<string, Rect> = {}
  const rugs: OfficeLayout['rugs'] = {}
  const desks: OfficeLayout['desks'] = {}
  const devices: OfficeLayout['devices'] = {}
  const rowsOfRooms: (typeof sized)[] = []
  for (let i = 0; i < sized.length; i += ROOMS_PER_ROW) rowsOfRooms.push(sized.slice(i, i + ROOMS_PER_ROW))
  const rowWidth = (r: typeof sized) => r.reduce((s, x) => s + x.w, 0) + ROOM_GAP * (r.length - 1)
  const maxW = Math.max(0, ...rowsOfRooms.map(rowWidth))

  let y = 0
  for (const row of rowsOfRooms) {
    let x = (maxW - rowWidth(row)) / 2
    const rowH = Math.max(...row.map((r) => r.h))
    for (const r of row) {
      rooms[r.dept.id] = { x, y, w: r.w, h: r.h }
      const rugW = (r.cols - 1) * PITCH_X + 300
      rugs[r.dept.id] = r.staff.length
        ? { x: (r.w - rugW) / 2, y: STAFF_Y - 130, w: rugW, h: (r.baseH - 40) - (STAFF_Y - 130) }
        : null
      const left = Math.ceil(r.devices.length / 2)
      r.devices.forEach((id, i) => {
        const dx = i < left ? -DEV_AISLE / 2 - DEV_PITCH * (left - i - 0.5) : DEV_AISLE / 2 + DEV_PITCH * (i - left + 0.5)
        devices[id] = { x: x + r.w / 2 + dx, y: y + r.baseH + DEV_BASE_OFFSET }
      })
      if (r.head) desks[r.head.id] = { x: x + r.w / 2, y: y + HEAD_Y }
      r.staff.forEach((a, i) => {
        const rowIdx = i < r.cols ? 0 : 1
        const inRow = rowIdx === 0 ? Math.min(r.cols, r.staff.length) : r.staff.length - r.cols
        const col = rowIdx === 0 ? i : i - r.cols
        desks[a.id] = { x: x + r.w / 2 + (col - (inRow - 1) / 2) * PITCH_X, y: y + STAFF_Y + rowIdx * PITCH_Y }
      })
      x += r.w + ROOM_GAP
    }
    y += rowH + ROOM_GAP
  }
  let height = Math.max(0, y - ROOM_GAP)
  if (sorted.length) {
    // Khu chung nằm giữa hàng cuối, bên dưới các phòng
    rooms[COMMON_ID] = { x: (maxW - COMMON_W) / 2, y: height + ROOM_GAP, w: COMMON_W, h: COMMON_H }
    rugs[COMMON_ID] = null
    height += ROOM_GAP + COMMON_H
  }
  return { rooms, rugs, desks, devices, bounds: { x: 0, y: 0, w: Math.max(maxW, sorted.length ? COMMON_W : 0), h: height } }
}
