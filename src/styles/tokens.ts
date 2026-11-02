import { STATUS_STYLE } from '../lib/statusColors'

// Design tokens. Mỗi phòng có 4 màu: floor (sàn nhạt), wall (tường), accent (đậm), textOnAccent.
// Dark mode CHƯA làm; khi cần, thêm bộ `dark` song song và truyền vào applyCssTokens().
export interface Palette { floor: string; wall: string; accent: string; textOnAccent: string }

// textOnAccent đều đạt tương phản AA (>= 4.5:1) trên accent; được kiểm tra khi build mock.
export const PALETTES = {
  bronze: { floor: '#fbf3e0', wall: '#e8d5a8', accent: '#9a5f10', textOnAccent: '#ffffff' },
  coral: { floor: '#fdeceb', wall: '#f4c5c0', accent: '#c93d31', textOnAccent: '#ffffff' },
  violet: { floor: '#f8eefa', wall: '#e3c4ea', accent: '#a8379a', textOnAccent: '#ffffff' },
  blue: { floor: '#e8f0fe', wall: '#bcd0f7', accent: '#2563eb', textOnAccent: '#ffffff' },
  green: { floor: '#e8f7ee', wall: '#bfe3cc', accent: '#15803d', textOnAccent: '#ffffff' },
  orange: { floor: '#fff0e1', wall: '#f5cfa6', accent: '#b8530a', textOnAccent: '#ffffff' },
  steel: { floor: '#e9edf1', wall: '#b4c0cc', accent: '#0e7490', textOnAccent: '#ffffff' }, // xám thép, điểm nhấn cyan
} as const satisfies Record<string, Palette>
export type PaletteName = keyof typeof PALETTES

/** Khoảng cách / bo góc thống nhất (lưới 8px). */
export const SPACING = { unit: 8, radius: 12, radiusLg: 16 } as const

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const mix = (hex: string, withHex: string, t: number) => {
  const [a, b] = [rgb(hex), rgb(withHex)]
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Bảng màu của phòng theo màu accent BE trả về; accent lạ (phòng mới) thì tự suy ra floor/wall. */
export function paletteFor(accent: string): Palette {
  const known = Object.values<Palette>(PALETTES).find((p) => p.accent.toLowerCase() === accent.toLowerCase())
  if (known) return known
  return {
    accent,
    floor: mix(accent, '#ffffff', 0.9),
    wall: mix(accent, '#ffffff', 0.7),
    textOnAccent: contrastRatio(accent, '#ffffff') >= 4.5 ? '#ffffff' : '#0f172a',
  }
}

/** Xuất token ra biến CSS trên :root, để Tailwind dùng: bg-[var(--dept-coral-floor)]. */
export function applyCssTokens() {
  const root = document.documentElement.style
  for (const [name, p] of Object.entries(PALETTES)) {
    for (const [k, v] of Object.entries(p)) root.setProperty(`--dept-${name}-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, v)
  }
  for (const [status, s] of Object.entries(STATUS_STYLE)) root.setProperty(`--status-${status.toLowerCase()}`, s.color)
}
