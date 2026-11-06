/** 272000 -> "272K", 1048576 -> "1M", null -> "—" (token). */
export function formatTokens(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return String(n)
}

/** true/false/không báo -> nhãn cho cột "Ảnh". */
export const yesNo = (v: boolean | null | undefined): string => (v == null ? '—' : v ? 'Có' : 'Không')
