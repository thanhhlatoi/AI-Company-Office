/** Hằng số của hệ thống sprite. Mọi con số dùng chung nằm ở đây. */
export const TILE = 32 // ô logic (px)
export const FRAME_W = 32 // khung nhân vật
export const FRAME_H = 48 // anchor (0.5, 1) ở chân

export type Dir = 'down' | 'up' | 'left' | 'right'
/** Hướng thật sự được vẽ; 'left' = lật ngang 'right' (scale.x = -1) nên không cần khung riêng. */
export type DrawnDir = 'down' | 'up' | 'right'
export const DRAWN_DIRS: readonly DrawnDir[] = ['down', 'up', 'right']
export const ALL_DIRS: readonly Dir[] = ['down', 'up', 'left', 'right']
export const drawnDir = (d: Dir): DrawnDir => (d === 'left' ? 'right' : d)

export type AnimLevel = 'A' | 'B'
export interface AnimSpec { frames: number; fps: number; level: AnimLevel }

/**
 * Bảng hoạt ảnh. Mức A bắt buộc; mức B có thì dùng, thiếu thì lùi về ANIM_FALLBACK.
 * Tên khung trong atlas: `{anim}_{dir}_{index}` (vd sit_type_down_0).
 */
export const ANIM_TABLE = {
  sit_idle: { frames: 2, fps: 2, level: 'A' },
  sit_type: { frames: 4, fps: 8, level: 'A' },
  sit_hand: { frames: 2, fps: 3, level: 'A' },
  sit_sleep: { frames: 2, fps: 1, level: 'A' },
  stand: { frames: 1, fps: 1, level: 'A' },
  walk: { frames: 4, fps: 8, level: 'A' },
  sit_error: { frames: 2, fps: 4, level: 'B' },
  sit_think: { frames: 2, fps: 2, level: 'B' },
  talk: { frames: 2, fps: 4, level: 'B' },
  drink: { frames: 2, fps: 2, level: 'B' },
} as const satisfies Record<string, AnimSpec>
export type AnimName = keyof typeof ANIM_TABLE

/** Hoạt ảnh mức B thiếu thì dùng hoạt ảnh mức A gần nhất. */
export const ANIM_FALLBACK: Partial<Record<AnimName, AnimName>> = {
  sit_error: 'sit_hand', sit_think: 'sit_idle', talk: 'stand', drink: 'stand',
}

export const frameName = (anim: string, dir: DrawnDir, i: number) => `${anim}_${dir}_${i}`
export const animKey = (anim: string, dir: DrawnDir) => `${anim}_${dir}`

/** Chiều cao mặt đứng của tường (px): tường bắc/đông/tây cao; tường phía nam (gần camera) thấp để không che người phía sau. */
export const WALL = { tallPx: 40, lowPx: 10 } as const
/** Chân nhân vật ngồi thấp hơn đáy ô ghế chừng này, để đứng trên ghế nhưng sau bàn. */
export const SIT_FEET_DY = 6
export const ACTOR_DEPTH_BIAS = 2

export const FLOOR_PATTERNS = ['wood', 'carpet', 'tile', 'checker', 'plain'] as const
export type FloorPattern = (typeof FLOOR_PATTERNS)[number]

export type Quality = 'low' | 'medium' | 'high'
/** Mức chất lượng: LOW tắt bóng + cross-fade, hoạt ảnh chậm lại và chỉ chạy cho agent trong khung nhìn. */
export const QUALITY: Record<Quality, { shadow: boolean; crossfadeMs: number; fpsScale: number; animateOffscreen: boolean }> = {
  low: { shadow: false, crossfadeMs: 0, fpsScale: 0.5, animateOffscreen: false },
  medium: { shadow: true, crossfadeMs: 120, fpsScale: 1, animateOffscreen: true },
  high: { shadow: true, crossfadeMs: 120, fpsScale: 1, animateOffscreen: true },
}

/** Tư thế: đổi dáng ngồi lúc rảnh. */
export const POSE = {
  idleSlotMs: 4000, // cứ mỗi khoảng này xét lại một lần có "nhìn quanh" hay không
  idleLookChance: 0.25, // xác suất mỗi lượt (có mầm theo id agent, không dùng Math.random)
} as const

/** Nhãn tên/trạng thái trên đầu nhân vật. */
export const LABEL = {
  basePx: 12, // cỡ chữ gốc của Nameplate
  minPx: 11, // chữ trên màn hình không nhỏ hơn
  maxPx: 16, // ... và không to hơn
  gap: 6, // khoảng hở giữa đầu và nhãn (px thế giới)
  maxShift: 72, // tối đa được đẩy lên để tránh nhãn khác
  pad: 2, // hở giữa hai nhãn
} as const
export const LOD_FAR_ZOOM = 0.6 // zoom nhỏ hơn mức này: chỉ còn chấm trạng thái

/** Đo FPS (trung bình trượt) và gợi ý hạ chất lượng. */
export const PERF = {
  windowMs: 5000, // FPS = trung bình trong khoảng này
  lowFps: 40, // thấp hơn mức này...
  sustainMs: 3000, // ...liên tục chừng này thì gợi ý hạ mức
  pauseMs: 1000, // hai frame cách nhau hơn mức này = tab bị ẩn/đứng: bỏ mẫu cũ
  cooldownMs: 30000, // sau một lần gợi ý, chờ chừng này mới gợi ý lại
  reportMs: 500,
} as const
/** Mức hạ tiếp theo khi FPS thấp. */
export const LOWER: Record<Quality, Quality | null> = { high: 'medium', medium: 'low', low: null }

export const BUBBLE = { maxChars: 40, ms: 3000, fadeMs: 400 } as const
export const EMOTE_POS = { x: 21, y: -36 } as const // biểu tượng cạnh đầu
/** Điểm cầm vật ở tay (tạm, tới khi manifest.carryOffsets có dữ liệu). */
export const CARRY_POS = { x: 11, y: -16 } as const
