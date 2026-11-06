import { PROP_INFO, PROP_KINDS, type PropKind, type PropSlot } from '../../../config/departments'
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
// khu bàn trưởng phòng ở giữa và thảm nhân viên (từ y ~340). Ô của từng loại đồ khai báo ở config/departments.ts (PROP_INFO).
type Slot = PropSlot

// Record<PropKind, ...> bắt buộc phải có hàm vẽ cho mọi prop khai báo trong config.
const MAKERS: Record<PropKind, () => Prop> = {
  plant: plant,
  'goal-board': goalBoard,
  'meeting-table': () => meetingTable('meeting-table'),
  'meeting-table-large': () => meetingTable('meeting-table-large'),
  'coffee-machine': coffeeMachine,
  'approval-corner': approvalCorner,
  'idea-board': ideaBoard,
  'timeline-screen': timelineScreen,
  'ring-light': ringLight,
  microphone: microphone,
  'neon-sign': neonSign,
  'phone-stand': phoneStand,
  'poster-wall': posterWall,
  whiteboard: whiteboard,
  'server-rack': serverRack,
  'cash-register': cashRegister,
  'filing-cabinet': filingCabinet,
  'chart-wall': chartWall,
  safe: safe,
  'growth-chart': growthChart,
  'delivery-map': deliveryMap,
  'network-board': networkBoard,
  ups: ups,
  'temp-gauge': tempGauge,
}
const REGISTRY = Object.fromEntries(PROP_KINDS.map((k) => [k, { make: MAKERS[k], slot: PROP_INFO[k].slot }])) as Record<PropKind, { make: () => Prop; slot: Slot }>

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
