import type { Texture } from 'pixi.js'
import type { DrawnDir } from './config.ts'
import type { CharacterLayerDef } from './manifest.ts'

/** Một chuỗi khung sẵn sàng đưa vào AnimatedSprite. `scale` = assetScale của nguồn (procedural luôn 1). */
export interface Clip {
  textures: Texture[]
  fps: number
  scale: number
  anchor: [number, number]
  offsetPx: [number, number]
  source: 'atlas' | 'procedural'
}
/** `scale` = assetScale của nguồn (gói 16px phóng gấp đôi). */
export interface TileSprite { texture: Texture; tintable: boolean; scale: number }

export interface SpriteProvider {
  /** Các lớp nhân vật có thể vẽ, đã sắp theo `order`. */
  layers(): CharacterLayerDef[]
  /** Có hình thật cho hoạt ảnh này không (hình tạm luôn đủ). resolvePose dùng để lùi mức B về mức A. */
  hasAnim(anim: string): boolean
  clip(layerId: string, anim: string, dir: DrawnDir): Clip | null
  prop(catalogKey: string, state: string): Clip | null
  tile(pattern: string): TileSprite | null
}

/** Id lớp procedural của một loại lớp: proc_body / proc_hair / proc_outfit. */
export const procLayerId = (kind: CharacterLayerDef['kind']) => `proc_${kind}`

/**
 * Atlas trước, thiếu khung nào thì lấy hình tạm cho đúng khung đó (không bao giờ vỡ vì thiếu hình).
 * Lớp: nếu atlas có ít nhất một lớp thì dùng danh sách lớp của atlas; không thì dùng lớp procedural.
 */
export class CompositeProvider implements SpriteProvider {
  private missingSet = new Set<string>()
  private atlas: SpriteProvider | null
  private fallback: SpriteProvider
  constructor(atlas: SpriteProvider | null, fallback: SpriteProvider) { this.atlas = atlas; this.fallback = fallback }

  /**
   * Lớp thật thay ĐÚNG loại lớp nó cung cấp; loại lớp atlas không có thì giữ hình tạm (vd chỉ có atlas body thì outfit/hair vẫn là hình tạm).
   * Lớp `prebuilt` (avatar dựng sẵn) thì không thêm hình tạm nào. Không có atlas: toàn bộ hình tạm.
   */
  layers() {
    const real = this.atlas?.layers() ?? []
    if (!real.length) return this.fallback.layers()
    if (real.some((l) => l.prebuilt)) return real
    const kinds = new Set(real.map((l) => l.kind))
    return [...real, ...this.fallback.layers().filter((l) => !kinds.has(l.kind))].sort((a, b) => a.order - b.order)
  }

  hasAnim(anim: string) { return this.atlas?.layers().length ? this.atlas.hasAnim(anim) : this.fallback.hasAnim(anim) }

  clip(layerId: string, anim: string, dir: DrawnDir) {
    const real = this.atlas?.layers().find((l) => l.id === layerId)
    if (real) {
      const c = this.atlas?.clip(layerId, anim, dir)
      if (c) return c
      this.note(`${layerId}/${anim}_${dir}`)
      return this.fallback.clip(procLayerId(real.kind), anim, dir)
    }
    return this.fallback.clip(layerId, anim, dir)
  }

  prop(key: string, state: string) {
    const c = this.atlas?.prop(key, state)
    if (c) return c
    if (this.atlas) this.note(`prop:${key}/${state}`)
    return this.fallback.prop(key, state)
  }

  tile(pattern: string) {
    const t = this.atlas?.tile(pattern)
    if (t) return t
    if (this.atlas) this.note(`tile:${pattern}`)
    return this.fallback.tile(pattern)
  }

  /** Các khung/đồ vật đang được thay bằng hình tạm (cho /dev/sprites). */
  missing(): string[] { return [...this.missingSet].sort() }

  private note(key: string) {
    if (this.missingSet.has(key)) return
    this.missingSet.add(key)
    console.warn(`[sprites] thiếu ${key} trong atlas, dùng hình tạm`)
  }
}
