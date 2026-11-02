import { crc32, deflateSync } from 'node:zlib'

export type RGBA = [number, number, number, number]

/** Bảng pixel RGBA tối giản để vẽ hình mẫu (chỉ hình chữ nhật). Toạ độ nhân hệ số k (1 = 32px, 0.5 = gói 16px). */
export class Canvas {
  readonly data: Uint8Array
  readonly w: number
  readonly h: number
  private k: number
  constructor(w: number, h: number, k = 1) { this.w = w; this.h = h; this.k = k; this.data = new Uint8Array(w * h * 4) }
  rect(x: number, y: number, w: number, h: number, c: RGBA, ox = 0, oy = 0) {
    const [x0, y0, x1, y1] = [x, y, x + w, y + h].map((v, i) => Math.round(v * this.k) + (i % 2 ? oy : ox))
    for (let j = Math.max(0, y0); j < Math.min(this.h, Math.max(y1, y0 + 1)); j++)
      for (let i = Math.max(0, x0); i < Math.min(this.w, Math.max(x1, x0 + 1)); i++) this.data.set(c, (j * this.w + i) * 4)
  }
  /** Chép canvas con vào vị trí (px thật) của canvas này. */
  blit(src: Canvas, dx: number, dy: number) {
    for (let j = 0; j < src.h; j++) this.data.set(src.data.subarray(j * src.w * 4, (j + 1) * src.w * 4), ((dy + j) * this.w + dx) * 4)
  }
}

const chunk = (type: string, data: Uint8Array) => {
  const body = Buffer.concat([Buffer.from(type), data])
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

export function encodePng(c: Canvas): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(c.w, 0); ihdr.writeUInt32BE(c.h, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8 bit, RGBA
  const raw = Buffer.alloc((c.w * 4 + 1) * c.h)
  for (let y = 0; y < c.h; y++) Buffer.from(c.data.subarray(y * c.w * 4, (y + 1) * c.w * 4)).copy(raw, y * (c.w * 4 + 1) + 1)
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())])
}
