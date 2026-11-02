// So sánh hai đoạn văn bản theo dòng (LCS). Không import gì để chạy được bằng `node --test`.
export interface DiffLine { kind: 'same' | 'add' | 'del'; text: string; /** số dòng ở bản cũ / bản mới */ a?: number; b?: number }

const MAX_LINES = 1500 // ponytail: LCS O(n*m); prompt dài hơn thế thì coi như thay toàn bộ

export function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n'), b = newText.split('\n')
  if (a.length > MAX_LINES || b.length > MAX_LINES) return [...a.map((text, i) => ({ kind: 'del' as const, text, a: i + 1 })), ...b.map((text, i) => ({ kind: 'add' as const, text, b: i + 1 }))]
  const n = a.length, m = b.length
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
  const out: DiffLine[] = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ kind: 'same', text: a[i], a: i + 1, b: j + 1 }); i++; j++ }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ kind: 'del', text: a[i], a: ++i })
    else out.push({ kind: 'add', text: b[j], b: ++j })
  }
  while (i < n) out.push({ kind: 'del', text: a[i], a: ++i })
  while (j < m) out.push({ kind: 'add', text: b[j], b: ++j })
  return out
}
export const diffStats = (d: DiffLine[]) => ({ added: d.filter((x) => x.kind === 'add').length, removed: d.filter((x) => x.kind === 'del').length })
