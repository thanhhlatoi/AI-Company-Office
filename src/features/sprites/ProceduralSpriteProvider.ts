import { Rectangle, type Graphics, type Renderer, type Texture } from 'pixi.js'
import { ANIM_TABLE, FLOOR_PATTERNS, FRAME_H, FRAME_W, TILE, WALL, type DrawnDir } from './config.ts'
import { MOCK_CATALOG, catalogByKey } from './catalog.ts'
import type { CharacterLayerDef } from './manifest.ts'
import type { Clip, SpriteProvider, TileSprite } from './provider.ts'
import { drawCharPart, type CharPart } from './proceduralChar.ts'
import { drawProp, drawTile } from './proceduralProps.ts'
import { drawDoor, drawWall } from './proceduralWalls.ts'

const PARTS: CharPart[] = ['body', 'outfit', 'hair']
const RES = 2 // độ phân giải texture tạm, đủ nét khi zoom

/** Hình tạm bằng code: cùng tên hoạt ảnh/số khung như bản thật. Texture tạo lười và cache. */
export class ProceduralSpriteProvider implements SpriteProvider {
  private renderer: Renderer
  private clips = new Map<string, Clip>()
  private tiles = new Map<string, TileSprite>()
  constructor(renderer: Renderer) { this.renderer = renderer }

  layers(): CharacterLayerDef[] {
    return PARTS.map((kind, i) => ({ id: `proc_${kind}`, kind, style: 'stick', atlas: '', tintable: true, order: i * 10, prebuilt: false, pack: 'procedural' }))
  }

  hasAnim(anim: string) { return anim in ANIM_TABLE }

  clip(layerId: string, anim: string, dir: DrawnDir): Clip | null {
    const spec = ANIM_TABLE[anim as keyof typeof ANIM_TABLE]
    const part = PARTS.find((p) => `proc_${p}` === layerId)
    if (!spec || !part) return null
    return this.cached(`${layerId}/${anim}_${dir}`, () => ({
      textures: Array.from({ length: spec.frames }, (_, i) => this.bake(drawCharPart(part, anim, dir, i), new Rectangle(0, 0, FRAME_W, FRAME_H))),
      fps: spec.fps, scale: 1, anchor: [0.5, 1], offsetPx: [0, 0], source: 'procedural',
    }))
  }

  prop(key: string, state: string): Clip | null {
    const item = catalogByKey(key)
    if (!item) return null
    const st = item.states[state] ? state : 'default' in item.states ? 'default' : Object.keys(item.states)[0]
    const frames = item.states[st]
    return this.cached(`prop:${key}/${st}`, () => ({
      textures: Array.from({ length: frames }, (_, i) => this.bake(drawProp(item, st, i), new Rectangle(0, 0, item.w * TILE, item.heightPx))),
      fps: item.fps?.[st] ?? 2, scale: 1, anchor: [0, 1], offsetPx: [0, 0], source: 'procedural',
    }))
  }

  /** Ô sàn (wood/carpet/...), mảnh tường `wall_[low_]{mask}`, khung cửa `door_{h|v}[_low]`. */
  tile(pattern: string): TileSprite | null {
    let t = this.tiles.get(pattern)
    if (!t) {
      const texture = this.buildTile(pattern)
      if (!texture) return null
      this.tiles.set(pattern, t = { texture, tintable: true, scale: 1 })
    }
    return t
  }

  private buildTile(p: string): Texture | null {
    if ((FLOOR_PATTERNS as readonly string[]).includes(p)) return this.bake(drawTile(p), new Rectangle(0, 0, TILE, TILE))
    const wall = /^wall_(low_)?(\d+)$/.exec(p)
    const door = /^door_([hv])(_low)?$/.exec(p)
    const low = !!(wall?.[1] ?? door?.[2])
    const h = low ? WALL.lowPx : WALL.tallPx
    if (wall) return this.bake(drawWall(+wall[2], h), new Rectangle(0, 0, TILE, TILE + h))
    if (door) return this.bake(drawDoor(door[1] as 'h' | 'v', h, low), new Rectangle(0, 0, TILE, TILE + h))
    return null
  }

  /** Tên các đồ vật procedural có sẵn (cho trang dev). */
  propKeys() { return MOCK_CATALOG.map((c) => c.key) }

  private cached(key: string, make: () => Clip) {
    let c = this.clips.get(key)
    if (!c) this.clips.set(key, c = make())
    return c
  }

  private bake(g: Graphics, frame: Rectangle): Texture {
    const tex = this.renderer.generateTexture({ target: g, frame, resolution: RES })
    g.destroy()
    return tex
  }
}
