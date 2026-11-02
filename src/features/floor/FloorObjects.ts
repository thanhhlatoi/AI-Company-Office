import { Container, Sprite, Text } from 'pixi.js'
import { TILE } from '../sprites/config.ts'
import { catalogByKey, type CatalogItem } from '../sprites/catalog.ts'
import { depthKey } from '../sprites/projection.ts'
import type { Clip, SpriteProvider } from '../sprites/provider.ts'
import { frameIndex, hashId } from '../sprites/resolvePose.ts'
import type { FloorObject } from '../../types/floor.ts'

/** Khoá độ sâu của đồ vật: y đáy footprint (px) + chỉnh nhỏ theo loại. */
export const objectDepth = (o: Pick<FloorObject, 'x' | 'y'>, item: Pick<CatalogItem, 'h' | 'depthBias'>) => depthKey({ gy: o.y, h: item.h }, item.depthBias ?? 0)

interface View { obj: FloorObject; item: CatalogItem; sprite: Sprite; clip: Clip; state: string; phase: number; label?: Text }
export type LabelPlace = 'above' | 'center'

/**
 * Đồ vật KHÔNG phẳng: mỗi cái một sprite trong lớp sắp độ sâu (cùng lớp với nhân vật), nằm ngoài chunk cache.
 * Đồ vật có hoạt ảnh liên tục gom vào `animated` để bật/tắt hàng loạt khi chất lượng thấp.
 */
export class FloorObjects {
  private views = new Map<string, View>()
  private animated: View[] = []
  private layer: Container
  private provider: SpriteProvider
  constructor(layer: Container, provider: SpriteProvider) { this.layer = layer; this.provider = provider }

  set(objects: FloorObject[]) {
    this.clear()
    for (const obj of objects) {
      const item = catalogByKey(obj.catalogKey)
      if (!item || item.flat) continue
      const clip = this.provider.prop(obj.catalogKey, 'default')
      if (!clip) continue
      const sprite = new Sprite(clip.textures[0])
      sprite.anchor.set(...clip.anchor)
      sprite.scale.set(clip.scale)
      sprite.position.set(obj.x * TILE + clip.offsetPx[0], (obj.y + item.h) * TILE + clip.offsetPx[1])
      sprite.zIndex = objectDepth(obj, item)
      sprite.cullable = true
      this.layer.addChild(sprite)
      const v = { obj, item, sprite, clip, state: 'default', phase: hashId(obj.id) % 5000 }
      this.views.set(obj.id, v)
      if (Object.values(item.states).some((n) => n > 1)) this.animated.push(v)
    }
  }

  /** Đổi trạng thái hình của một đồ vật (màn hình theo agent, tủ rack theo thiết bị, máy cà phê khi có người dùng). */
  setState(id: string, state: string) {
    const v = this.views.get(id)
    if (!v || v.state === state) return
    const clip = this.provider.prop(v.obj.catalogKey, state)
    if (!clip) return
    v.state = state
    v.clip = clip
    v.sprite.texture = clip.textures[0]
  }

  /** Chữ trên đồ vật (số dư két, bảng mục tiêu). Chuỗi rỗng = bỏ chữ. */
  setLabel(id: string, text: string, place: LabelPlace) {
    const v = this.views.get(id)
    if (!v) return
    if (!text) { v.label?.destroy(); v.label = undefined; return }
    if (!v.label) {
      const dark = place === 'center'
      v.label = new Text({ text, resolution: 3, style: { fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: '700', fill: dark ? '#fde68a' : '#14532d', align: 'center', stroke: dark ? undefined : { color: '#ffffff', width: 3 } } })
      v.label.anchor.set(0.5)
      v.label.scale.set(1 / v.clip.scale)
      v.sprite.addChild(v.label)
    } else if (v.label.text !== text) v.label.text = text
    v.label.position.set((v.item.w * TILE) / 2, place === 'center' ? -(v.item.heightPx - 10) / 2 : -v.item.heightPx - 7)
  }

  /** Mỗi frame: chỉ đồ vật nhiều khung mới đổi texture. `animate=false` (chất lượng thấp / giảm chuyển động) = đứng ở khung 0. */
  tick(now: number, animate: boolean) {
    for (const v of this.animated) {
      const n = v.clip.textures.length
      if (n > 1) v.sprite.texture = v.clip.textures[animate ? frameIndex('prop', n, v.clip.fps, now + v.phase, false) : 0]
    }
  }

  sprites(): Sprite[] { return [...this.views.values()].map((v) => v.sprite) }

  destroy() { this.clear() }

  private clear() {
    for (const v of this.views.values()) v.sprite.destroy({ children: true })
    this.views.clear()
    this.animated = []
  }
}
