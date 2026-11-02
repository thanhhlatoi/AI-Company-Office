/** Bộ sinh số ngẫu nhiên có hạt giống: dữ liệu mock giống nhau giữa các lần tải trang. */
export function rng(seed: number) {
  let a = seed
  const next = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T,>(a: readonly T[]) => a[Math.floor(next() * a.length)],
    /** chọn theo trọng số: weighted([['a', 3], ['b', 1]]) */
    weighted: <T,>(items: readonly (readonly [T, number])[]) => {
      let r = next() * items.reduce((s, [, w]) => s + w, 0)
      for (const [v, w] of items) { r -= w; if (r <= 0) return v }
      return items[items.length - 1][0]
    },
  }
}
export const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000
