import { PERF } from '../sprites/config.ts'

/** FPS trung bình trượt (windowMs) + phát hiện "thấp liên tục". Thuần, không đụng đồng hồ: truyền thời gian vào. */
export class FpsMonitor {
  private times: number[] = []
  private lowSince: number | null = null

  /** Gọi mỗi frame. fps = null khi chưa đủ mẫu (cửa sổ chưa đầy 80%). */
  frame(now: number): { fps: number | null; sustainedLow: boolean } {
    const last = this.times[this.times.length - 1]
    if (last !== undefined && now - last > PERF.pauseMs) this.reset() // tab ẩn / đứng hình: không tính vào trung bình
    this.times.push(now)
    while (this.times[0] < now - PERF.windowMs) this.times.shift()
    const span = now - this.times[0]
    const fps = span >= PERF.windowMs * 0.8 ? ((this.times.length - 1) / span) * 1000 : null
    if (fps !== null && fps < PERF.lowFps) this.lowSince ??= now
    else this.lowSince = null
    return { fps, sustainedLow: this.lowSince !== null && now - this.lowSince >= PERF.sustainMs }
  }

  reset() { this.times = []; this.lowSince = null }
}
