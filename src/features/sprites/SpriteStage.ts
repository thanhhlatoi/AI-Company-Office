import { AnimatedSprite, Container, Graphics, Sprite, Text } from 'pixi.js'
import { ANIM_TABLE, ALL_DIRS, FLOOR_PATTERNS, FRAME_H, FRAME_W, TILE, drawnDir } from './config.ts'
import { MOCK_CATALOG } from './catalog.ts'
import type { CharacterLayerDef } from './manifest.ts'
import type { SpriteProvider } from './provider.ts'

export interface StageOpts { skin: string; hair: string; outfit: string; floor: string; fpsScale: number; grid: boolean; anchor: boolean }

const LABEL_W = 96
const CELL_W = 84
const ROW_H = 72
const STAGE_W = 780
const tintOf = (kind: CharacterLayerDef['kind'], o: StageOpts) => (kind === 'body' ? o.skin : kind === 'hair' ? o.hair : kind === 'outfit' ? o.outfit : '#ffffff')
const label = (t: string, x: number, y: number) => { const l = new Text({ text: t, style: { fontFamily: 'Inter, sans-serif', fontSize: 11, fill: '#334155' } }); l.position.set(x, y); return l }

/** Dựng toàn bộ bảng kiểm tra: mỗi hoạt ảnh x 4 hướng, rồi đồ vật (footprint + điểm tương tác), rồi ô sàn. */
export function buildStage(provider: SpriteProvider, o: StageOpts): { root: Container; height: number } {
  const root = new Container()
  const layers = provider.layers()
  let y = 8
  ALL_DIRS.forEach((d, i) => root.addChild(label(d === 'left' ? 'left (lật right)' : d, LABEL_W + i * CELL_W + 8, y)))
  y += 18
  for (const [anim, spec] of Object.entries(ANIM_TABLE)) {
    root.addChild(label(`${anim} · ${spec.frames}k · ${spec.level}`, 8, y + ROW_H / 2 - 14))
    ALL_DIRS.forEach((dir, i) => {
      const cx = LABEL_W + i * CELL_W + CELL_W / 2
      const foot = y + ROW_H - 6
      if (o.grid) root.addChild(new Graphics().rect(cx - FRAME_W / 2, foot - FRAME_H, FRAME_W, FRAME_H).stroke({ width: 1, color: '#94a3b8', alpha: 0.7 }))
      for (const layer of layers) {
        const clip = provider.clip(layer.id, anim, drawnDir(dir))
        if (!clip) continue
        const s = new AnimatedSprite(clip.textures)
        s.anchor.set(...clip.anchor)
        s.scale.set(clip.scale * (dir === 'left' ? -1 : 1), clip.scale)
        s.position.set(cx + clip.offsetPx[0], foot + clip.offsetPx[1])
        if (layer.tintable) s.tint = tintOf(layer.kind, o)
        s.animationSpeed = (clip.fps * o.fpsScale) / 60
        s.play()
        root.addChild(s)
      }
      if (o.anchor) root.addChild(new Graphics().circle(cx, foot, 2.5).fill('#ef4444').moveTo(cx - 8, foot).lineTo(cx + 8, foot).stroke({ width: 1, color: '#ef4444' }))
    })
    y += ROW_H
  }

  y += 12
  root.addChild(label('Đồ vật (khung xanh = footprint · xanh lá = chỗ ngồi · cam = đứng thăm · tím = dùng)', 8, y))
  y += 20
  let x = 8
  let rowH = 0
  for (const item of MOCK_CATALOG) {
    for (const state of Object.keys(item.states)) {
      const w = item.w * TILE
      const stride = Math.max(w, 84) + 12 // đủ rộng cho nhãn
      if (x + stride > STAGE_W) { x = 8; y += rowH + 22; rowH = 0 }
      const clip = provider.prop(item.key, state)
      const bottom = y + item.heightPx
      if (clip) {
        const s = new AnimatedSprite(clip.textures)
        s.anchor.set(...clip.anchor)
        s.scale.set(clip.scale)
        s.position.set(x + clip.offsetPx[0], bottom + clip.offsetPx[1])
        s.animationSpeed = (clip.fps * o.fpsScale) / 60
        s.play()
        root.addChild(s)
      }
      const top = bottom - item.h * TILE
      root.addChild(new Graphics().rect(x, top, w, item.h * TILE).stroke({ width: 1.5, color: '#2563eb' }))
      const dot = (p: { dx: number; dy: number } | undefined, c: string) => p && root.addChild(new Graphics().circle(x + p.dx * TILE, top + p.dy * TILE, 4).fill(c))
      dot(item.seat, '#16a34a'); dot(item.visit, '#f97316'); dot(item.use, '#9333ea')
      root.addChild(label(`${item.key}/${state}`, x, bottom + 4))
      x += stride
      rowH = Math.max(rowH, item.heightPx)
    }
  }
  y += rowH + 30

  root.addChild(label('Ô sàn (tint theo màu sàn)', 8, y))
  y += 18
  FLOOR_PATTERNS.forEach((p, i) => {
    const t = provider.tile(p)
    if (!t) return
    const s = new Sprite(t.texture)
    s.scale.set(2)
    s.position.set(8 + i * 90, y)
    if (t.tintable) s.tint = o.floor
    root.addChild(s, label(p, 8 + i * 90, y + TILE * 2 + 2))
  })
  return { root, height: y + TILE * 2 + 24 }
}
