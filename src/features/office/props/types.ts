import { Text, type Container, type Graphics } from 'pixi.js'

/** Một đồ trang trí. Mỗi prop là một hàm vẽ riêng; sau này thay bằng ảnh/tileset mà không đổi cấu trúc. */
export interface Prop {
  view: Container
  width: number
  height: number
  /** Chuyển động chậm lặp lại; không gọi khi người dùng bật giảm chuyển động. */
  animate?: (now: number) => void
}

/** Bóng mềm dưới vật thể = 2 lớp mờ chồng nhau (rẻ hơn filter blur). */
export function softShadow(g: Graphics, x: number, y: number, w: number, h: number, r = 8) {
  g.roundRect(x, y + 10, w, h, r).fill({ color: '#0f172a', alpha: 0.05 })
  g.roundRect(x, y + 5, w, h, r).fill({ color: '#0f172a', alpha: 0.07 })
}

/** Các đỉnh của hình chữ nhật xoay quanh tâm (Graphics không xoay được từng hình). Dùng: g.poly(quad(...)).fill(c). */
export function quad(cx: number, cy: number, w: number, h: number, angle: number): number[] {
  const [c, s] = [Math.cos(angle), Math.sin(angle)]
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].flatMap(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c])
}

/** Văn bản trang trí (cỡ >= 12px, độ phân giải cao để nét khi zoom). */
export const decoText = (text: string, size: number, fill: string, weight: '400' | '600' | '700' = '700') =>
  new Text({ text, resolution: 3, style: { fontFamily: 'Inter, sans-serif', fontSize: size, fontWeight: weight, fill } })
