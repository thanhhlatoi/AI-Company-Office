import { Container, Sprite } from 'pixi.js'
import { drawnDir, type Dir } from './config.ts'
import { avatarOf, tintFor, type Avatar } from './avatar.ts'
import type { CharacterLayerDef } from './manifest.ts'
import type { Clip, SpriteProvider } from './provider.ts'
import { frameIndex } from './resolvePose.ts'

interface Part { sprite: Sprite; clip: Clip; layer: CharacterLayerDef }

/** Bộ lớp của MỘT (hoạt ảnh, hướng): mọi lớp dùng cùng tên hoạt ảnh và cùng chỉ số khung. */
class Rig extends Container {
  readonly anim: string
  parts: Part[] = []
  startedAt = 0
  fadeMs = 0
  constructor(anim: string) { super(); this.anim = anim }
}

/** Các lớp nhân vật (body, outfit, hair, ...) + chuyển hoạt ảnh bằng cross-fade ngắn (hoặc đổi ngay khi chất lượng thấp). */
export class CharacterLayers extends Container {
  private provider: SpriteProvider
  private avatar: Avatar = avatarOf({ id: '', color: '#2563eb' })
  private cur: Rig | null = null
  private fading: Rig[] = []
  private key = ''

  constructor(provider: SpriteProvider) { super(); this.provider = provider }

  setAvatar(av: Avatar) {
    if (av.skin === this.avatar.skin && av.hair === this.avatar.hair && av.outfit === this.avatar.outfit) return
    this.avatar = av
    for (const rig of [this.cur, ...this.fading]) for (const p of rig?.parts ?? []) this.applyTint(p)
  }

  /** Đổi hoạt ảnh/hướng. Hướng trái = hướng phải lật ngang (anchor ở giữa nên không lệch). */
  play(anim: string, dir: Dir, fadeMs: number, nowMs: number) {
    const key = `${anim}|${dir}`
    if (key === this.key) return
    this.key = key
    const rig = this.build(anim, dir)
    if (this.cur) {
      const old = this.cur
      if (fadeMs > 0) { this.fading.push(old); old.fadeMs = fadeMs; old.startedAt = nowMs; rig.fadeMs = fadeMs; rig.startedAt = nowMs; rig.alpha = 0 }
      else old.destroy({ children: true })
    }
    this.cur = rig
    this.addChild(rig)
  }

  /** `nowMs` đã cộng pha riêng của agent. */
  tick(nowMs: number, fpsScale: number, reduced: boolean) {
    const cur = this.cur
    if (cur?.fadeMs && cur.alpha < 1) cur.alpha = Math.min(1, (nowMs - cur.startedAt) / cur.fadeMs)
    this.fading = this.fading.filter((r) => {
      const t = (nowMs - r.startedAt) / r.fadeMs
      if (t < 1) { r.alpha = 1 - t; this.step(r, nowMs, fpsScale, reduced); return true }
      r.destroy({ children: true })
      return false
    })
    if (cur) this.step(cur, nowMs, fpsScale, reduced)
  }

  private step(rig: Rig, nowMs: number, fpsScale: number, reduced: boolean) {
    for (const p of rig.parts) {
      const n = p.clip.textures.length
      p.sprite.texture = p.clip.textures[frameIndex(rig.anim, n, p.clip.fps * fpsScale, nowMs, reduced) % n]
    }
  }

  private build(anim: string, dir: Dir): Rig {
    const rig = new Rig(anim)
    rig.scale.x = dir === 'left' ? -1 : 1
    for (const layer of this.provider.layers()) {
      const clip = this.provider.clip(layer.id, anim, drawnDir(dir))
      if (!clip?.textures.length) continue // lớp thiếu thì bỏ qua
      const sprite = new Sprite(clip.textures[0])
      sprite.anchor.set(...clip.anchor)
      sprite.scale.set(clip.scale)
      sprite.position.set(...clip.offsetPx)
      const part = { sprite, clip, layer }
      this.applyTint(part)
      rig.parts.push(part)
      rig.addChild(sprite)
    }
    return rig
  }

  private applyTint(p: Part) { p.sprite.tint = tintFor(p.layer, this.avatar) ?? 0xffffff }
}
