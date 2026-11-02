import { basename } from 'node:path'

interface Rect { x: number; y: number; w: number; h: number }
interface AseFrame { filename?: string; frame: Rect; trimmed?: boolean; sourceSize?: { w: number; h: number } }
interface AseTag { name: string; from: number; to: number; direction?: 'forward' | 'reverse' | 'pingpong' | 'pingpong_reverse' }
export interface AseExport { frames: AseFrame[] | Record<string, AseFrame>; meta: { image?: string; size: { w: number; h: number }; frameTags?: AseTag[] } }
export interface PixiSheet {
  frames: Record<string, { frame: Rect; rotated: false; trimmed: boolean; spriteSourceSize: Rect; sourceSize: { w: number; h: number } }>
  animations: Record<string, string[]>
  meta: { app: string; version: string; image: string; format: string; size: { w: number; h: number }; scale: string }
}

/** Thứ tự khung của một thẻ theo hướng chạy của Aseprite. */
export function tagOrder(from: number, to: number, dir: AseTag['direction'] = 'forward'): number[] {
  const fwd = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const rev = [...fwd].reverse()
  const back = (a: number[]) => a.slice(1, -1).reverse() // lùi lại, không lặp hai đầu
  switch (dir) {
    case 'reverse': return rev
    case 'pingpong': return [...fwd, ...back(fwd)]
    case 'pingpong_reverse': return [...rev, ...back(rev)]
    default: return fwd
  }
}

/**
 * Aseprite (File > Export Sprite Sheet, kèm JSON data + Meta: Tags) -> atlas PixiJS có khoá `animations`.
 * Mỗi thẻ (tag) `{anim}_{dir}` thành một hoạt ảnh; khung được đặt tên `{tag}_{index}`. Khung không thuộc thẻ nào bị bỏ (có cảnh báo).
 */
export function asepriteToPixi(ase: AseExport, image?: string): { sheet: PixiSheet; warnings: string[] } {
  const list = Array.isArray(ase.frames) ? ase.frames : Object.values(ase.frames)
  const tags = ase.meta.frameTags ?? []
  const warnings: string[] = []
  if (!tags.length) throw new Error('JSON không có meta.frameTags: trong Aseprite hãy bật "Meta: Tags" khi xuất')
  const sheet: PixiSheet = { frames: {}, animations: {}, meta: { app: 'aseprite-to-pixi', version: '1', image: image ?? basename(ase.meta.image ?? 'sheet.png'), format: 'RGBA8888', size: ase.meta.size, scale: '1' } }
  const usedFrames = new Set<number>()
  for (const tag of tags) {
    if (tag.from < 0 || tag.to >= list.length || tag.from > tag.to) throw new Error(`thẻ "${tag.name}" có khoảng khung ${tag.from}-${tag.to} không hợp lệ (có ${list.length} khung)`)
    if (sheet.animations[tag.name]) throw new Error(`trùng tên thẻ "${tag.name}"`)
    if (!/^[a-z]+(?:_[a-z]+)*_(down|up|right)$/.test(tag.name)) warnings.push(`thẻ "${tag.name}" không theo {anim}_{dir} (dir: down/up/right)`)
    sheet.animations[tag.name] = tagOrder(tag.from, tag.to, tag.direction).map((src, i) => {
      const f = list[src]
      const name = `${tag.name}_${i}`
      usedFrames.add(src)
      sheet.frames[name] = { frame: f.frame, rotated: false, trimmed: f.trimmed ?? false, spriteSourceSize: { x: 0, y: 0, w: f.frame.w, h: f.frame.h }, sourceSize: f.sourceSize ?? { w: f.frame.w, h: f.frame.h } }
      return name
    })
  }
  list.forEach((_, i) => { if (!usedFrames.has(i)) warnings.push(`khung #${i} không thuộc thẻ nào, bị bỏ`) })
  return { sheet, warnings }
}
