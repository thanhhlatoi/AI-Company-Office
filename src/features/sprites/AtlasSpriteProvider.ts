import { Assets, type Spritesheet, type Texture } from 'pixi.js'
import { animKey, type DrawnDir } from './config.ts'
import type { CharacterLayerDef, Manifest } from './manifest.ts'
import type { Clip, SpriteProvider, TileSprite } from './provider.ts'

/** Nạp atlas thật (TexturePacker/aseprite-to-pixi) theo manifest. Atlas lỗi chỉ bị bỏ qua + cảnh báo. */
export class AtlasSpriteProvider implements SpriteProvider {
  private manifest: Manifest
  private sheets: Map<string, Spritesheet>
  private sorted: CharacterLayerDef[]

  private constructor(manifest: Manifest, sheets: Map<string, Spritesheet>) {
    this.manifest = manifest
    this.sheets = sheets
    // chỉ giữ lớp có atlas nạp được; Composite sẽ lùi về hình tạm cho phần còn lại
    this.sorted = manifest.characterLayers.filter((l) => sheets.has(l.atlas)).sort((a, b) => a.order - b.order)
  }

  static async load(manifest: Manifest, baseUrl: string): Promise<AtlasSpriteProvider> {
    const urls = new Set([...manifest.characterLayers, ...manifest.props, ...manifest.tiles].map((x) => x.atlas))
    const sheets = new Map<string, Spritesheet>()
    await Promise.all([...urls].map(async (u) => {
      try {
        const sheet = await Assets.load<Spritesheet>(baseUrl + u)
        const mode = manifest.pixelArt ? 'nearest' : 'linear'
        for (const t of Object.values(sheet.textures)) t.source.scaleMode = mode
        sheets.set(u, sheet)
      } catch (e) { console.warn(`[sprites] không nạp được atlas ${u}`, e) }
    }))
    return new AtlasSpriteProvider(manifest, sheets)
  }

  hasContent() { return this.sheets.size > 0 }
  layers() { return this.sorted }

  /** Hoạt ảnh thiếu khung (ít hơn số khung dự kiến) coi như chưa có: lùi về hình tạm/hoạt ảnh gần nhất thay vì chạy cụt. */
  private complete(anim: string, textures: Texture[] | undefined) { return !!textures?.length && textures.length === (this.manifest.animations[anim]?.frames ?? textures.length) }

  hasAnim(anim: string) { return this.sorted.some((l) => this.complete(anim, this.sheets.get(l.atlas)?.animations[animKey(anim, 'down')])) }

  clip(layerId: string, anim: string, dir: DrawnDir): Clip | null {
    const layer = this.sorted.find((l) => l.id === layerId)
    const textures = layer && this.sheets.get(layer.atlas)?.animations[animKey(anim, dir)]
    if (!textures || !this.complete(anim, textures)) return null
    return this.make(textures, this.manifest.animations[anim]?.fps ?? 8, [0.5, 1], [0, 0])
  }

  prop(key: string, state: string): Clip | null {
    const p = this.manifest.props.find((x) => x.catalogKey === key)
    const sheet = p && this.sheets.get(p.atlas)
    if (!p || !sheet) return null
    const name = p.states[state] ?? p.states.default ?? p.animation ?? p.frame
    const textures = name ? (sheet.animations[name] ?? (sheet.textures[name] ? [sheet.textures[name]] : undefined)) : undefined
    return textures?.length ? this.make(textures, 2, p.anchor, p.offsetPx) : null
  }

  tile(pattern: string): TileSprite | null {
    const t = this.manifest.tiles.find((x) => x.pattern === pattern)
    const texture = t && this.sheets.get(t.atlas)?.textures[t.frame ?? pattern]
    return t && texture ? { texture, tintable: t.tintable, scale: this.manifest.assetScale } : null
  }

  private make(textures: Texture[], fps: number, anchor: [number, number], offsetPx: [number, number]): Clip {
    return { textures, fps, scale: this.manifest.assetScale, anchor, offsetPx, source: 'atlas' }
  }
}
