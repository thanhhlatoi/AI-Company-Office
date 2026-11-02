import { Container, Graphics, Rectangle } from 'pixi.js'
import { STATUS_STYLE } from '../../../lib/statusColors'
import type { AgentStatus, Device, DeviceStatus, DeviceType } from '../../../types'
import { Nameplate } from '../Nameplate'
import { drawShape, type Shape } from './shapes'

const TYPE_LABEL: Record<DeviceType, string> = { WORKSTATION: 'PC', AI_PC: 'PC AI', LAPTOP: 'Laptop', SERVER: 'Server', ROUTER: 'Router', NAS: 'NAS' }
// Trạng thái thiết bị mượn kiểu màu/viên thuốc của agent để nhãn giống nhãn nhân vật
const AS_AGENT: Record<DeviceStatus, { status: AgentStatus; text: string }> = {
  ONLINE: { status: 'IDLE', text: 'Trực tuyến' },
  DEGRADED: { status: 'WORKING', text: 'Hoạt động kém' },
  OFFLINE: { status: 'ERROR', text: 'Mất kết nối' },
}
const ACCENT = '#0e7490'
const BAR_W = 64
const BAR_H = 5
const barColor = (v: number) => (v >= 90 ? '#dc2626' : v >= 70 ? '#ca8a04' : '#16a34a')

/** Một thiết bị thật trên canvas. Gốc (0,0) = giữa đáy. Tách khỏi nhân vật: không dính AgentActor. */
export class DeviceView extends Container {
  readonly deviceId: string
  private shape: Shape
  private body = new Graphics()
  private led = new Graphics()
  private blinkers: Graphics[] = []
  private fan = new Container()
  private beacon = new Container() // đèn báo động xoay khi OFFLINE
  private sweep = new Graphics()
  private bars = new Graphics()
  private plate = new Nameplate()
  private bigLed = new Graphics() // zoom xa: chỉ còn màu đèn
  private ring = new Graphics()
  private status: DeviceStatus = 'ONLINE'
  private gpuUtil = 0
  private far = false
  private barKey = ''
  private statusKey = ''
  private nBars = 2

  constructor(device: Pick<Device, 'id' | 'type' | 'name'>, onTap: (id: string) => void, wasDragged: () => boolean) {
    super()
    this.deviceId = device.id
    this.shape = drawShape(device.type, this.body)
    const { h, led, blinkers, fan } = this.shape
    this.led.position.set(...led)
    for (const [x, y] of blinkers) { const b = new Graphics().circle(0, 0, 2.2).fill('#22c55e'); b.position.set(x, y); this.blinkers.push(b) }
    if (fan) {
      for (let i = 0; i < 4; i++) { const b = new Graphics().ellipse(0, -fan.r / 2, 4, fan.r / 2).fill('#67e8f9'); b.rotation = (i * Math.PI) / 2; this.fan.addChild(b) }
      this.fan.position.set(fan.x, fan.y)
    }
    this.nBars = device.type === 'AI_PC' ? 4 : 2
    // Đèn báo động: đế đỏ + tia sáng quét
    this.sweep.poly([0, 0, -10, -16, 10, -16]).fill({ color: '#fecaca', alpha: 0.9 })
    this.beacon.addChild(new Graphics().circle(0, 0, 7).fill('#dc2626').stroke({ width: 2, color: '#fff' }), this.sweep)
    this.beacon.position.set(led[0], led[1] - 12)
    this.beacon.visible = false
    this.plate.y = -h - 8 - this.nBars * (BAR_H + 3) - Nameplate.HEIGHT
    this.plate.setIdentity(device.name, TYPE_LABEL[device.type], ACCENT)
    this.bigLed.position.set(0, -h - 14)
    this.bigLed.visible = false
    this.ring.roundRect(-60, -h - 8, 120, h + 16, 12).fill({ color: '#0e7490', alpha: 0.08 }).stroke({ width: 3, color: '#0e7490' })
    this.ring.visible = false
    this.addChild(this.ring, this.body, this.fan, ...this.blinkers, this.led, this.bars, this.plate, this.bigLed, this.beacon)
    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.hitArea = new Rectangle(-58, -h - 8, 116, h + 12)
    this.on('pointertap', (e) => { e.stopPropagation(); if (!wasDragged()) onTap(device.id) })
  }

  /** Cập nhật nhãn, đèn, thanh chỉ số theo dữ liệu mới nhất. Chỉ vẽ lại khi giá trị đổi. */
  update(d: Device) {
    this.status = d.status
    this.gpuUtil = d.metrics.gpu?.utilPct ?? 0
    const k = `${d.name}|${d.status}`
    if (k !== this.statusKey) {
      this.statusKey = k
      const m = AS_AGENT[d.status]
      this.plate.setStatus(m.status, m.text)
      const color = STATUS_STYLE[m.status].color
      this.led.clear().circle(0, 0, 4.5).fill(color).stroke({ width: 1.5, color: '#ffffff' })
      this.bigLed.clear().circle(0, 0, 18).fill(color).stroke({ width: 4, color: '#ffffff' })
      this.body.alpha = d.status === 'OFFLINE' ? 0.6 : 1
      this.beacon.visible = d.status === 'OFFLINE'
    }
    const g = d.metrics.gpu
    const vals = [d.metrics.cpuPct, d.metrics.ramPct, ...(this.nBars === 4 ? [g?.utilPct, g?.vramPct] : [])]
    const bk = vals.map((v) => (v == null ? '-' : Math.round(v / 2))).join(',') // lượng tử hoá để không vẽ lại mỗi nhịp nhiễu
    if (bk === this.barKey) return
    this.barKey = bk
    this.bars.clear()
    vals.forEach((v, i) => {
      if (v == null) return
      const y = -this.shape.h - 6 - (i + 1) * (BAR_H + 3)
      this.bars.roundRect(-BAR_W / 2, y, BAR_W, BAR_H, 2).fill('#cbd5e1').roundRect(-BAR_W / 2, y, (BAR_W * Math.min(100, v)) / 100, BAR_H, 2).fill(barColor(v))
    })
  }

  setLod(far: boolean) {
    this.far = far
    this.plate.visible = this.bars.visible = !far
    this.bigLed.visible = far
  }

  setSelected(v: boolean) { this.ring.visible = v }

  /** Gọi mỗi frame. `reduced` = giảm chuyển động: đèn đứng yên, quạt và đèn báo động không quay. */
  animate(now: number, reduced: boolean) {
    const off = this.status === 'OFFLINE'
    const blink = reduced || this.status !== 'ONLINE' ? 1 : 0.55 + 0.45 * Math.sin(now / 600) // ONLINE nhấp nháy chậm
    this.led.alpha = blink
    this.bigLed.alpha = this.far ? blink : 1
    this.blinkers.forEach((b, i) => { b.alpha = off ? 0.1 : reduced ? 1 : Math.sin(now / (230 + i * 41)) * Math.sin(now / (370 + i * 29)) > -0.1 ? 1 : 0.2 })
    if (reduced) return
    if (this.shape.fan) this.fan.rotation = off ? this.fan.rotation : now * (0.004 + (this.gpuUtil / 100) * 0.02) // GPU nặng quạt quay nhanh
    if (off) this.sweep.rotation = now / 250
  }
}
