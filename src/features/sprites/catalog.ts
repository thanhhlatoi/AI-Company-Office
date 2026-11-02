import { TILE } from './config.ts'

/**
 * Catalog đồ vật TẠM (mock) cho tới khi có ObjectCatalog thật từ BE (5A).
 * w/h = footprint (ô); heightPx = chiều cao hình vẽ (vẽ lên phía trên đáy footprint);
 * seat/visit/use = điểm tương tác, toạ độ ô tương đối góc trên-trái footprint.
 */
export interface CatalogItem {
  key: string
  name: string
  w: number
  h: number
  heightPx: number
  seat?: { dx: number; dy: number; facing: 'up' | 'down' | 'left' | 'right' }
  visit?: { dx: number; dy: number }
  use?: { dx: number; dy: number }
  /** Đồ vật phẳng (thảm): vẽ vào chunk cache nền, không tham gia sắp độ sâu. */
  flat?: boolean
  /** Chỉnh nhỏ khoá độ sâu theo loại (vd màn hình nằm trên bàn). */
  depthBias?: number
  /** Các trạng thái có hình; state không liệt kê thì dùng 'default'. */
  states: Record<string, number> // state -> số khung
  /** fps riêng của từng state (mặc định 2). */
  fps?: Record<string, number>
}

export const MOCK_CATALOG: CatalogItem[] = [
  { key: 'desk', name: 'Bàn làm việc', w: 3, h: 2, heightPx: 2 * TILE, visit: { dx: 3, dy: 1 }, states: { default: 1 } },
  { key: 'chair', name: 'Ghế', w: 1, h: 1, heightPx: 44, seat: { dx: 0.5, dy: 0.5, facing: 'down' }, states: { default: 1 } },
  { key: 'monitor', name: 'Màn hình', w: 1, h: 1, heightPx: 40, depthBias: 40, states: { off: 1, idle: 1, working: 2, error: 2 } },
  { key: 'plant', name: 'Cây', w: 1, h: 1, heightPx: 52, states: { default: 2 } },
  { key: 'coffee_machine', name: 'Máy cà phê', w: 1, h: 1, heightPx: 52, use: { dx: 0.5, dy: 1.5 }, states: { default: 1, active: 2 } },
  { key: 'server_rack', name: 'Tủ rack', w: 1, h: 1, heightPx: 64, use: { dx: 0.5, dy: 1.5 }, states: { default: 2, busy: 2, alert: 2, off: 1 }, fps: { busy: 7 } },
  { key: 'safe', name: 'Két sắt', w: 1, h: 1, heightPx: 40, states: { default: 1 } },
  { key: 'goal_board', name: 'Bảng mục tiêu', w: 3, h: 1, heightPx: 64, visit: { dx: 1.5, dy: 1.5 }, states: { default: 1 } },
  { key: 'rug', name: 'Thảm', w: 3, h: 2, heightPx: 2 * TILE, flat: true, states: { default: 1 } },
  { key: 'whiteboard', name: 'Bảng trắng', w: 3, h: 1, heightPx: 64, visit: { dx: 1.5, dy: 1.5 }, states: { default: 1 } },
]
export const catalogByKey = (key: string) => MOCK_CATALOG.find((c) => c.key === key)

/** Chiều ngang/dọc footprint (ô); key lạ coi như 1x1. */
export const footprintOf = (key: string) => { const c = catalogByKey(key); return { w: c?.w ?? 1, h: c?.h ?? 1 } }
