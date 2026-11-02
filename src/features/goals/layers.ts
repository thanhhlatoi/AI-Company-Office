/** Chia danh sách việc thành các tầng theo phụ thuộc: tầng 0 không phụ thuộc ai, tầng n phụ thuộc tầng n-1 trở xuống. Phụ thuộc vòng không làm treo (tính như tầng 0). */
export function layers<T>(items: T[], id: (t: T) => string, deps: (t: T) => string[]): T[][] {
  const byId = new Map(items.map((i) => [id(i), i]))
  const memo = new Map<string, number>()
  const depth = (item: T, path: Set<string>): number => {
    const k = id(item)
    const known = memo.get(k)
    if (known !== undefined) return known
    if (path.has(k)) return 0
    path.add(k)
    let d = 0
    for (const dep of deps(item)) { const x = byId.get(dep); if (x) d = Math.max(d, depth(x, path) + 1) }
    path.delete(k)
    memo.set(k, d)
    return d
  }
  const out: T[][] = []
  for (const i of items) (out[depth(i, new Set())] ??= []).push(i)
  return out.filter(Boolean)
}
