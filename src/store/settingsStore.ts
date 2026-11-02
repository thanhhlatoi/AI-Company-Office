import { create } from 'zustand'
import { DEFAULT_VND_RATE } from '../lib/money'

/** Cài đặt người dùng, lưu trong localStorage (đọc/ghi luôn bọc try/catch: chế độ riêng tư có thể chặn). */
export interface Settings {
  /** Đi lại ngẫu nhiên khi rảnh (mô phỏng, mặc định TẮT) */
  randomWalk: boolean
  /** tốc độ đi cơ bản, px/giây */
  walkSpeed: number
  /** Lớp "đường giao việc" trên canvas: đường nối cong + bong bóng khi có task.handoff (mặc định BẬT) */
  showHandoff: boolean
  /** Hiện thêm "≈ 320 đ" cạnh số tiền USD */
  showVnd: boolean
  /** Tỉ giá đ/USD */
  vndRate: number
}

const KEY = 'agentoffice.settings'
const DEFAULTS: Settings = { randomWalk: false, walkSpeed: 90, showHandoff: true, showVnd: false, vndRate: DEFAULT_VND_RATE }

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>
    return {
      randomWalk: raw.randomWalk === true,
      showHandoff: raw.showHandoff !== false,
      showVnd: raw.showVnd === true,
      vndRate: typeof raw.vndRate === 'number' && raw.vndRate > 0 ? raw.vndRate : DEFAULT_VND_RATE,
      walkSpeed: typeof raw.walkSpeed === 'number' ? Math.min(180, Math.max(60, raw.walkSpeed)) : DEFAULTS.walkSpeed,
    }
  } catch { return DEFAULTS }
}

interface SettingsState extends Settings { update: (patch: Partial<Settings>) => void }

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load(),
  update: (patch) => {
    set(patch)
    const { randomWalk, walkSpeed, showHandoff, showVnd, vndRate } = get()
    try { localStorage.setItem(KEY, JSON.stringify({ randomWalk, walkSpeed, showHandoff, showVnd, vndRate })) } catch { /* không lưu được thì thôi */ }
  },
}))
