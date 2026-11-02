import type { PropKind } from '../../../config/departments'
import { cashRegister, chartWall, filingCabinet, safe } from './Finance'
import { coffeeMachine, approvalCorner } from './Common'
import { goalBoard, meetingTable, plant } from './Executive'
import { deliveryMap, growthChart } from './Sales'
import { neonSign, phoneStand, posterWall } from './Tiktok'
import type { Prop } from './types'
import { whiteboard } from './Whiteboard'
import { networkBoard, tempGauge, ups } from './Infra'
import { serverRack } from './ServerRack'
import { ideaBoard, microphone, ringLight, timelineScreen } from './Youtube'

// Ô đặt đồ trong phòng (toạ độ tương đối so với phòng). Tránh vùng biển tên (y < 80 ở giữa),
// khu bàn trưởng phòng ở giữa và thảm nhân viên (từ y ~340).
type Slot = 'wall-left' | 'wall-right' | 'upper-left' | 'upper-right' | 'side-left' | 'side-right' | 'low-right' | 'common-left' | 'common-mid' | 'common-right'

// Record<PropKind, ...> bắt buộc phải có hàm vẽ cho mọi prop khai báo trong config.
const REGISTRY: Record<PropKind, { make: () => Prop; slot: Slot }> = {
  plant: { make: plant, slot: 'wall-left' },
  'goal-board': { make: goalBoard, slot: 'wall-right' },
  'meeting-table': { make: () => meetingTable('meeting-table'), slot: 'low-right' },
  'meeting-table-large': { make: () => meetingTable('meeting-table-large'), slot: 'common-left' },
  'coffee-machine': { make: coffeeMachine, slot: 'common-mid' },
  'approval-corner': { make: approvalCorner, slot: 'common-right' },
  'idea-board': { make: ideaBoard, slot: 'wall-left' },
  'timeline-screen': { make: timelineScreen, slot: 'wall-right' },
  'ring-light': { make: ringLight, slot: 'side-left' },
  microphone: { make: microphone, slot: 'side-right' },
  'neon-sign': { make: neonSign, slot: 'upper-left' },
  'phone-stand': { make: phoneStand, slot: 'side-left' },
  'poster-wall': { make: posterWall, slot: 'side-right' },
  whiteboard: { make: whiteboard, slot: 'wall-left' },
  'server-rack': { make: serverRack, slot: 'wall-right' },
  'cash-register': { make: cashRegister, slot: 'upper-left' },
  'filing-cabinet': { make: filingCabinet, slot: 'side-left' },
  'chart-wall': { make: chartWall, slot: 'upper-right' },
  safe: { make: safe, slot: 'side-right' },
  'growth-chart': { make: growthChart, slot: 'wall-left' },
  'delivery-map': { make: deliveryMap, slot: 'wall-right' },
  'network-board': { make: networkBoard, slot: 'wall-left' },
  ups: { make: ups, slot: 'side-left' },
  'temp-gauge': { make: tempGauge, slot: 'side-right' },
}

function position(slot: Slot, roomW: number, propW: number): [number, number] {
  switch (slot) {
    case 'wall-left': return [44, 40]
    case 'wall-right': return [roomW - 44 - propW, 40]
    case 'upper-left': return [40, 96]
    case 'upper-right': return [roomW - 40 - propW, 96]
    case 'side-left': return [40, 190]
    case 'side-right': return [roomW - 40 - propW, 190]
    case 'low-right': return [roomW - 24 - propW, 400]
    // Khu chung: ba khối trải ngang giữa phòng, dưới biển tên
    case 'common-left': return [roomW * 0.26 - propW / 2, 120]
    case 'common-mid': return [roomW * 0.6 - propW / 2, 150]
    case 'common-right': return [roomW * 0.82 - propW / 2, 150]
  }
}

const sizeCache = new Map<PropKind, { w: number; h: number }>()
/** Kích thước prop (đo bằng cách dựng thử một lần rồi nhớ lại) để tính vật cản mà không phải dựng Pixi mỗi lần. */
function sizeOf(kind: PropKind) {
  let s = sizeCache.get(kind)
  if (!s) {
    const p = REGISTRY[kind].make()
    s = { w: p.width, h: p.height }
    p.view.destroy({ children: true })
    sizeCache.set(kind, s)
  }
  return s
}

/** Vị trí + kích thước từng prop trong phòng (toạ độ so với góc phòng) — dùng cho lưới đường đi. */
export function propFootprints(kinds: PropKind[], roomW: number): { kind: PropKind; x: number; y: number; w: number; h: number }[] {
  return kinds.map((kind) => {
    const { w, h } = sizeOf(kind)
    const [x, y] = position(REGISTRY[kind].slot, roomW, w)
    return { kind, x, y, w, h }
  })
}

export function placeProps(kinds: PropKind[], roomW: number): Prop[] {
  const used = new Set<Slot>()
  return kinds.map((kind) => {
    const { make, slot } = REGISTRY[kind]
    if (used.has(slot)) console.warn(`[office] hai prop cùng ô "${slot}" trong một phòng: ${kind}`)
    used.add(slot)
    const prop = make()
    prop.view.position.set(...position(slot, roomW, prop.width))
    return prop
  })
}
