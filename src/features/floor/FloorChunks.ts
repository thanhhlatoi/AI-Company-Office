import { Container, Graphics, Sprite } from 'pixi.js'
import { TILE } from '../sprites/config.ts'
import { catalogByKey, footprintOf } from '../sprites/catalog.ts'
import type { SpriteProvider } from '../sprites/provider.ts'
import type { Layout } from '../../types/floor.ts'
import { CHUNK, E, N, S, W, buildCells, changedChunks, chunkSignatures, doorVariant, wallVariant, type Cell } from './grid.ts'

const CHUNK_PX = CHUNK * TILE
const EDGE_PX = 3 // bề dày viền chuyển tiếp mềm giữa hai kiểu sàn
const isFlat = (key: string) => !!catalogByKey(key)?.flat

/**
 * Nền tĩnh (sàn, viền, thảm phẳng, tường, khung cửa) chia chunk 16x16 ô; mỗi chunk cacheAsTexture().
 * Chỉ chunk có chữ ký đổi mới được dựng lại + updateCacheTexture(); không bao giờ cache cả tầng một texture.
 */
export class FloorChunks {
  readonly root = new Container()
  private chunks = new Map<string, Container>()
  private sigs = new Map<string, number>()

  /** Trả về danh sách chunk vừa dựng lại (để kiểm tra/ghi log). */
  update(layout: Layout, provider: SpriteProvider): string[] {
    const cells = buildCells(layout)
    const next = chunkSignatures(layout, cells, isFlat, footprintOf)
    const { rebuild, remove } = changedChunks(this.sigs, next)
    for (const k of remove) { this.chunks.get(k)?.destroy({ children: true }); this.chunks.delete(k) }
    for (const k of rebuild) this.build(k, layout, cells, provider)
    this.sigs = next
    return rebuild
  }

  private build(key: string, layout: Layout, cells: Map<number, Cell>, provider: SpriteProvider) {
    const [cx, cy] = key.split(',').map(Number)
    let box = this.chunks.get(key)
    const fresh = !box
    if (!box) {
      box = new Container()
      box.position.set(cx * CHUNK_PX, cy * CHUNK_PX)
      box.cullable = true
      this.chunks.set(key, box)
      this.root.addChild(box)
    }
    box.removeChildren().forEach((c) => c.destroy())
    const put = (name: string, x: number, y: number, tint: string | undefined, bottomLeft: boolean) => {
      const t = provider.tile(name)
      if (!t) return
      const s = new Sprite(t.texture)
      s.scale.set(t.scale)
      if (bottomLeft) s.anchor.set(0, 1)
      s.position.set(x * TILE - cx * CHUNK_PX, (bottomLeft ? y + 1 : y) * TILE - cy * CHUNK_PX)
      if (tint && t.tintable) s.tint = tint
      box.addChild(s)
    }
    const x0 = cx * CHUNK, y0 = cy * CHUNK
    const inChunk: [number, number, Cell][] = []
    for (let y = y0; y < y0 + CHUNK; y++) for (let x = x0; x < x0 + CHUNK; x++) { const c = cells.get(y * layout.width + x); if (c) inChunk.push([x, y, c]) }

    const edges = new Graphics()
    for (const [x, y, c] of inChunk) {
      if (!c.floor) continue
      put(c.floor.pattern, x, y, c.floor.color, false)
      const px = x * TILE - cx * CHUNK_PX, py = y * TILE - cy * CHUNK_PX
      if (c.edge & N) edges.rect(px, py, TILE, EDGE_PX)
      if (c.edge & S) edges.rect(px, py + TILE - EDGE_PX, TILE, EDGE_PX)
      if (c.edge & W) edges.rect(px, py, EDGE_PX, TILE)
      if (c.edge & E) edges.rect(px + TILE - EDGE_PX, py, EDGE_PX, TILE)
    }
    box.addChild(edges.fill({ color: 0x0f172a, alpha: 0.07 }))

    for (const o of layout.objects) { // thảm phẳng: vẽ ngay trên sàn, dưới tường
      const { w, h } = footprintOf(o.catalogKey)
      if (!isFlat(o.catalogKey) || o.x >= x0 + CHUNK || o.x + w <= x0 || o.y >= y0 + CHUNK || o.y + h <= y0) continue
      const clip = provider.prop(o.catalogKey, 'default')
      if (!clip) continue
      const s = new Sprite(clip.textures[0])
      s.anchor.set(...clip.anchor)
      s.scale.set(clip.scale)
      s.position.set(o.x * TILE - cx * CHUNK_PX + clip.offsetPx[0], (o.y + h) * TILE - cy * CHUNK_PX + clip.offsetPx[1])
      box.addChild(s)
    }
    for (const [x, y, c] of inChunk) { // hàng trên vẽ trước, hàng dưới đè lên (tường cao che phần trên của hàng dưới đúng thứ tự)
      if (c.wall) put(wallVariant(c.wall.mask, c.wall.low), x, y, c.wall.color, true)
      else if (c.door) put(doorVariant(c.door.axis, c.door.low), x, y, '#e2e8f0', true)
    }
    if (fresh) box.cacheAsTexture({ resolution: 2, antialias: false })
    else box.updateCacheTexture() // để khung hình kế tiếp vẽ lại từ cache mới
  }

  boxes(): Container[] { return [...this.chunks.values()] }

  destroy() { this.root.destroy({ children: true }) }
}
