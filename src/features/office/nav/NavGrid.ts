import { TILE } from './constants'

export interface Point { x: number; y: number }

const SQRT2 = Math.SQRT2
const DIRS: [number, number, number][] = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2]]
const BODY_R = 9 // bán kính thân nhân vật khi kiểm tra đường thẳng (tránh sượt góc vật cản)

/**
 * Lưới ô vuông 32px + A* 8 hướng (không cắt chéo qua góc vật cản) + làm mượt đường đi.
 * Kết quả được cache theo cặp (ô đầu, ô cuối); gọi `clearCache()` khi bố cục đổi.
 */
export class NavGrid {
  readonly cols: number
  readonly rows: number
  readonly originX: number
  readonly originY: number
  private blocked: Uint8Array
  private cache = new Map<number, Point[] | null>()
  // Mảng làm việc của A*, dùng lại giữa các lần tìm đường (không cấp phát lại)
  private g: Float32Array
  private f: Float32Array
  private parent: Int32Array
  private state: Uint8Array // 0 = chưa thấy, 1 = trong open, 2 = đã đóng

  constructor(minX: number, minY: number, maxX: number, maxY: number) {
    this.originX = Math.floor(minX / TILE) * TILE
    this.originY = Math.floor(minY / TILE) * TILE
    this.cols = Math.ceil((maxX - this.originX) / TILE)
    this.rows = Math.ceil((maxY - this.originY) / TILE)
    const n = this.cols * this.rows
    this.blocked = new Uint8Array(n)
    this.g = new Float32Array(n)
    this.f = new Float32Array(n)
    this.parent = new Int32Array(n)
    this.state = new Uint8Array(n)
  }

  idx(c: number, r: number) { return r * this.cols + c }
  colOf(x: number) { return Math.floor((x - this.originX) / TILE) }
  rowOf(y: number) { return Math.floor((y - this.originY) / TILE) }
  inside(c: number, r: number) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows }
  isFree(c: number, r: number) { return this.inside(c, r) && !this.blocked[this.idx(c, r)] }
  isFreeAt(x: number, y: number) { return this.isFree(this.colOf(x), this.rowOf(y)) }
  center(c: number, r: number): Point { return { x: this.originX + (c + 0.5) * TILE, y: this.originY + (r + 0.5) * TILE } }

  /** Đặt cờ cản cho mọi ô GIAO với hình chữ nhật (thận trọng: không để nhân vật sượt qua mép). */
  setRect(x: number, y: number, w: number, h: number, value: 0 | 1) {
    const c0 = Math.max(0, this.colOf(x)), c1 = Math.min(this.cols - 1, this.colOf(x + w - 0.001))
    const r0 = Math.max(0, this.rowOf(y)), r1 = Math.min(this.rows - 1, this.rowOf(y + h - 0.001))
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.blocked[this.idx(c, r)] = value
    this.cache.clear()
  }

  /** Cản các ô giao với hình tròn (bàn họp tròn). */
  blockCircle(cx: number, cy: number, radius: number) {
    const c0 = Math.max(0, this.colOf(cx - radius)), c1 = Math.min(this.cols - 1, this.colOf(cx + radius))
    const r0 = Math.max(0, this.rowOf(cy - radius)), r1 = Math.min(this.rows - 1, this.rowOf(cy + radius))
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const x0 = this.originX + c * TILE, y0 = this.originY + r * TILE
        const dx = Math.max(x0 - cx, 0, cx - (x0 + TILE)), dy = Math.max(y0 - cy, 0, cy - (y0 + TILE))
        if (dx * dx + dy * dy < radius * radius) this.blocked[this.idx(c, r)] = 1
      }
    }
    this.cache.clear()
  }

  clearCache() { this.cache.clear() }
  get cacheSize() { return this.cache.size }

  /** Ô trống gần nhất (BFS vòng tròn mở rộng); -1 nếu không có trong bán kính. */
  private nearestFree(c: number, r: number, maxR = 4): number {
    if (this.isFree(c, r)) return this.idx(c, r)
    for (let d = 1; d <= maxR; d++) {
      let best = -1, bestDist = Infinity
      for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d || !this.isFree(c + dc, r + dr)) continue
        const dist = dc * dc + dr * dr
        if (dist < bestDist) { bestDist = dist; best = this.idx(c + dc, r + dr) }
      }
      if (best >= 0) return best
    }
    return -1
  }

  /** Đường đi từ `from` tới `to` (toạ độ thế giới) hoặc null nếu không tới được. Không sửa mảng trả về (có thể là cache). */
  findPath(from: Point, to: Point, avoid?: Point[]): Point[] | null {
    const s = this.nearestFree(this.colOf(from.x), this.rowOf(from.y))
    const e = this.nearestFree(this.colOf(to.x), this.rowOf(to.y))
    if (s < 0 || e < 0) return null
    let interior: Point[] | null | undefined
    if (avoid?.length) {
      // Tránh người đang chắn đường: tạm chặn ô họ đang đứng, tìm xong thì trả lại. Không dùng cache vì kết quả phụ thuộc vị trí người.
      const touched: number[] = []
      for (const p of avoid) {
        const c = this.colOf(p.x), r = this.rowOf(p.y)
        if (!this.isFree(c, r)) continue
        const i = this.idx(c, r)
        if (i === s || i === e) continue
        this.blocked[i] = 1
        touched.push(i)
      }
      interior = this.search(s, e)
      for (const i of touched) this.blocked[i] = 0
    } else {
      const key = s * this.cols * this.rows + e
      interior = this.cache.get(key)
      if (interior === undefined) { interior = this.search(s, e); this.cache.set(key, interior) }
    }
    if (!interior) return null
    // Gắn điểm đầu/cuối chính xác vào đường đã cache (cache chỉ nhớ phần giữa, tính từ tâm ô).
    // Nếu từ điểm thật không nhìn thẳng tới được (ví dụ đang ngồi trong ghế là ô cản), đi tới tâm ô đầu/cuối trước.
    const pts: Point[] = [{ ...from }]
    if (!this.clearLine(from, interior[0] ?? to)) pts.push(this.center(s % this.cols, Math.floor(s / this.cols)))
    pts.push(...interior)
    if (!this.clearLine(pts[pts.length - 1], to)) pts.push(this.center(e % this.cols, Math.floor(e / this.cols)))
    pts.push({ ...to })
    return pts
  }

  /** A* trả về các điểm giữa (tâm ô), đã làm mượt, không gồm điểm đầu và điểm cuối. */
  private search(start: number, goal: number): Point[] | null {
    const { g, f, parent, state, cols } = this
    g.fill(Infinity)
    state.fill(0)
    const gr = Math.floor(goal / cols), gc = goal % cols
    const h = (i: number) => {
      const dx = Math.abs((i % cols) - gc), dy = Math.abs(Math.floor(i / cols) - gr)
      return dx + dy + (SQRT2 - 2) * Math.min(dx, dy) // octile
    }
    // Hàng đợi ưu tiên là heap nhị phân theo f
    const heap: number[] = []
    const push = (i: number) => {
      heap.push(i)
      let k = heap.length - 1
      while (k > 0) {
        const p = (k - 1) >> 1
        if (f[heap[p]] <= f[heap[k]]) break
        ;[heap[p], heap[k]] = [heap[k], heap[p]]
        k = p
      }
    }
    const pop = () => {
      const top = heap[0]
      const last = heap.pop() as number
      if (heap.length) {
        heap[0] = last
        let k = 0
        for (;;) {
          const l = 2 * k + 1, r = l + 1
          let m = k
          if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l
          if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r
          if (m === k) break
          ;[heap[m], heap[k]] = [heap[k], heap[m]]
          k = m
        }
      }
      return top
    }

    g[start] = 0
    f[start] = h(start)
    parent[start] = -1
    state[start] = 1
    push(start)
    while (heap.length) {
      const cur = pop()
      if (state[cur] === 2) continue // bản cũ của ô đã đóng
      if (cur === goal) return this.smooth(this.unwind(cur))
      state[cur] = 2
      const c = cur % cols, r = Math.floor(cur / cols)
      for (const [dc, dr, cost] of DIRS) {
        const nc = c + dc, nr = r + dr
        if (!this.isFree(nc, nr)) continue
        // không cắt chéo qua góc vật cản: đi chéo chỉ khi hai ô kề đều trống
        if (dc && dr && (!this.isFree(c + dc, r) || !this.isFree(c, r + dr))) continue
        const ni = this.idx(nc, nr)
        if (state[ni] === 2) continue
        const ng = g[cur] + cost
        if (ng >= g[ni]) continue
        g[ni] = ng
        f[ni] = ng + h(ni)
        parent[ni] = cur
        state[ni] = 1
        push(ni) // nếu ô đã có trong heap thì đây là bản tốt hơn; bản cũ bị bỏ qua khi pop
      }
    }
    return null
  }

  private unwind(goal: number): Point[] {
    const out: Point[] = []
    for (let i = goal; i >= 0; i = this.parent[i]) out.push(this.center(i % this.cols, Math.floor(i / this.cols)))
    return out.reverse()
  }

  /** Đoạn thẳng a->b đi được nếu mọi điểm lấy mẫu (và hai điểm lệch sang hai bên theo bán kính thân) đều nằm trong ô trống. */
  private clearLine(a: Point, b: Point): boolean {
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    const steps = Math.max(1, Math.ceil(len / 6))
    const nx = len ? (-dy / len) * BODY_R : 0, ny = len ? (dx / len) * BODY_R : 0
    for (let i = 0; i <= steps; i++) {
      const x = a.x + (dx * i) / steps, y = a.y + (dy * i) / steps
      if (!this.isFreeAt(x, y) || !this.isFreeAt(x + nx, y + ny) || !this.isFreeAt(x - nx, y - ny)) return false
    }
    return true
  }

  /** Làm mượt: từ mỗi điểm nhảy tới điểm xa nhất còn nhìn thẳng thấy được, bỏ các điểm thừa. */
  private smooth(path: Point[]): Point[] {
    if (path.length <= 2) return path.slice(1, -1)
    const out: Point[] = []
    let i = 0
    while (i < path.length - 1) {
      let j = path.length - 1
      while (j > i + 1 && !this.clearLine(path[i], path[j])) j--
      if (j < path.length - 1) out.push(path[j])
      i = j
    }
    return out
  }
}
