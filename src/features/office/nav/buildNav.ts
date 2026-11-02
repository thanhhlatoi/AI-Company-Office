import { roomProps } from '../../../config/departments'
import type { Agent, Department } from '../../../types'
import { COMMON_ID, DEVICE_FOOT, type OfficeLayout } from '../layout'
import { CHAIR_GAP, MEETING_TABLES, meetingSeats, meetingTableSize } from '../props/Executive'
import { propFootprints } from '../props'
import { DOOR_W, MARGIN, TILE, VISIT_OFFSET, WALL } from './constants'
import { NavGrid, type Point } from './NavGrid'

/** Các điểm đích có tên. Tất cả là toạ độ thế giới. */
export interface NavPlaces {
  meetingCenter: Point
  meetingSeats: Point[]
  coffee: Point
  approval: Point
  /** ô đứng cạnh bàn trưởng phòng, theo id phòng */
  headDesk: Record<string, Point>
  /** theo id agent */
  seat: Record<string, Point>
  visit: Record<string, Point>
  /** ô đứng ngay phía dưới thiết bị, theo id thiết bị */
  device: Record<string, Point>
}

export interface NavMap { grid: NavGrid; places: NavPlaces; doors: { x: number; y: number; w: number }[] }

// Kích thước bàn (khớp DeskView): nhân viên 120x56, trưởng phòng 1.4 lần.
const deskSize = (isHead: boolean) => (isHead ? { w: 168, h: 78 } : { w: 120, h: 56 })

/**
 * Dựng lưới đường đi từ bố cục: tường (bề dày 1 ô) có cửa ở giữa tường trên và tường dưới, bàn và đồ trang trí là vật cản,
 * hành lang giữa các phòng đi được. Trả thêm các điểm đích có tên (họp, cà phê, chờ duyệt, bàn trưởng phòng...).
 */
export function buildNav(layout: OfficeLayout, agents: Record<string, Agent>, departments: Record<string, Department>): NavMap {
  const b = layout.bounds
  const grid = new NavGrid(b.x - MARGIN, b.y - MARGIN, b.x + b.w + MARGIN, b.y + b.h + MARGIN)
  const doors: NavMap['doors'] = []
  const places: NavPlaces = { meetingCenter: { x: 0, y: 0 }, meetingSeats: [], coffee: { x: 0, y: 0 }, approval: { x: 0, y: 0 }, headDesk: {}, seat: {}, visit: {}, device: {} }

  for (const [id, r] of Object.entries(layout.rooms)) {
    // tường bốn phía
    grid.setRect(r.x, r.y, r.w, WALL, 1)
    grid.setRect(r.x, r.y + r.h - WALL, r.w, WALL, 1)
    grid.setRect(r.x, r.y, WALL, r.h, 1)
    grid.setRect(r.x + r.w - WALL, r.y, WALL, r.h, 1)

    // đồ trang trí
    const slug = id === COMMON_ID ? 'khu-chung' : departments[id]?.slug ?? ''
    for (const fp of propFootprints(roomProps(slug), r.w)) {
      const x = r.x + fp.x, y = r.y + fp.y
      if (fp.kind === 'meeting-table' || fp.kind === 'meeting-table-large') {
        // Bàn họp ở Khu chung: chỉ cản mặt bàn (chừa lề một ô) để ghế xung quanh đi tới được.
        // Bàn họp trang trí ở phòng Điều hành: cản cả vòng ghế (không ai ngồi ở đó).
        const { seats, tableR } = MEETING_TABLES[fp.kind]
        const c = meetingTableSize(tableR) / 2
        grid.blockCircle(x + c, y + c, fp.kind === 'meeting-table-large' ? tableR - 20 : tableR + CHAIR_GAP)
        if (fp.kind === 'meeting-table-large') {
          places.meetingCenter = { x: x + c, y: y + c }
          places.meetingSeats = meetingSeats(seats, tableR).map((p) => ({ x: x + p.x, y: y + p.y }))
        }
      } else {
        grid.setRect(x, y, fp.w, fp.h, 1)
        const front = { x: x + fp.w / 2, y: y + fp.h + TILE } // đứng ngay phía dưới
        if (fp.kind === 'coffee-machine') places.coffee = front
        if (fp.kind === 'approval-corner') places.approval = front
      }
    }
  }

  // thiết bị: vật cản; đứng kiểm tra ở ngay phía dưới
  for (const [id, p] of Object.entries(layout.devices)) {
    grid.setRect(p.x - DEVICE_FOOT.w / 2, p.y - DEVICE_FOOT.h, DEVICE_FOOT.w, DEVICE_FOOT.h, 1)
    places.device[id] = { x: p.x, y: p.y + TILE }
  }

  // bàn: thân bàn là vật cản; ghế để trống (nhân vật ngồi và đứng dậy từ đó)
  for (const [agentId, p] of Object.entries(layout.desks)) {
    const a = agents[agentId]
    if (!a) continue
    const { w, h } = deskSize(a.isHead)
    grid.setRect(p.x - w / 2, p.y - 8, w, h, 1)
    grid.setRect(p.x - 24, p.y - 46, 48, 36, 1) // ghế có người ngồi cũng là vật cản: không ai đi xuyên qua người đang ngồi
    places.seat[agentId] = { x: p.x, y: p.y - 10 }
    places.visit[agentId] = { x: p.x + w / 2 + VISIT_OFFSET, y: p.y + 6 }
    if (a.isHead && a.departmentId) places.headDesk[a.departmentId] = places.visit[agentId]
  }

  // cửa: mở một khe DOOR_W ở giữa tường trên và tường dưới của mỗi phòng (xuyên cả bề dày tường)
  for (const r of Object.values(layout.rooms)) {
    for (const y of [r.y, r.y + r.h - WALL]) {
      const door = { x: r.x + r.w / 2 - DOOR_W / 2, y, w: DOOR_W }
      grid.setRect(door.x, y, DOOR_W, WALL, 0)
      doors.push(door)
    }
  }
  return { grid, places, doors }
}
