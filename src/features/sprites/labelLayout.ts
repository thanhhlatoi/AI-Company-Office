import { LABEL } from './config.ts'

/** Hệ số phóng nhãn để chữ trên màn hình nằm trong [minPx, maxPx]. */
export function labelScale(zoom: number): number {
  const px = LABEL.basePx * zoom
  return px < LABEL.minPx ? LABEL.minPx / px : px > LABEL.maxPx ? LABEL.maxPx / px : 1
}

export interface LabelBox { id: string; x: number; y: number; w: number; h: number } // thế giới; y = cạnh trên

/**
 * Tránh nhãn chồng nhau: nhãn thấp hơn trên màn hình (gần camera) giữ nguyên, nhãn phía sau bị đẩy LÊN,
 * tối đa maxShift. Trả về độ đẩy lên (px >= 0) cho từng id.
 */
export function avoidOverlaps(boxes: LabelBox[], maxShift: number = LABEL.maxShift): Map<string, number> {
  const out = new Map<string, number>()
  const placed: LabelBox[] = []
  for (const b of [...boxes].sort((p, q) => q.y + q.h - (p.y + p.h))) {
    let dy = 0
    for (let n = 0; n < 12; n++) {
      const hit = placed.find((p) => Math.abs(p.x - b.x) < (p.w + b.w) / 2 && p.y < b.y - dy + b.h + LABEL.pad && b.y - dy < p.y + p.h + LABEL.pad)
      if (!hit) break
      dy = Math.min(maxShift, b.y + b.h + LABEL.pad - hit.y)
      if (dy >= maxShift) break
    }
    out.set(b.id, dy)
    placed.push({ ...b, y: b.y - dy })
  }
  return out
}
