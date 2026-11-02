import { Container, Graphics, Text } from 'pixi.js'
import { BUBBLE } from './config.ts'

/** Bong bóng chat: bo tròn, tối đa 40 ký tự, tự tắt sau 3 giây. Gốc (0,0) = chân đuôi bong bóng. */
export class Bubble extends Container {
  private bg = new Graphics()
  private txt = new Text({ text: '', resolution: 3, style: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: '600', fill: '#0f172a', wordWrap: true, wordWrapWidth: 170, align: 'center' } })
  private until = 0

  constructor() {
    super()
    this.txt.anchor.set(0.5, 1)
    this.visible = false
    this.addChild(this.bg, this.txt)
  }

  get active() { return this.until > 0 }

  say(text: string, now: number) {
    this.txt.text = text.length > BUBBLE.maxChars ? `${text.slice(0, BUBBLE.maxChars - 1)}…` : text
    const w = Math.max(60, this.txt.width + 20)
    const h = this.txt.height + 14
    this.txt.position.set(0, -10)
    this.bg.clear()
      .roundRect(-w / 2, -h - 10, w, h, 12).fill({ color: '#ffffff', alpha: 0.97 }).stroke({ width: 1.5, color: '#94a3b8' })
      .poly([-7, -10.5, 7, -10.5, 0, 0]).fill('#ffffff') // đuôi chỉ xuống người nói
    this.until = now + BUBBLE.ms
    this.alpha = 1
    this.visible = true
  }

  tick(now: number) {
    if (!this.until) return
    const left = this.until - now
    if (left <= 0) { this.until = 0; this.visible = false } else this.alpha = Math.min(1, left / BUBBLE.fadeMs)
  }
}
