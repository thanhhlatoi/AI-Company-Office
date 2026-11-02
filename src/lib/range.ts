// Khoảng thời gian cho Chi phí / Dashboard. Theo Asia/Ho_Chi_Minh (UTC+7, không có giờ mùa hè).
const DAY = 86_400_000
const OFFSET = 7 * 3_600_000

export type RangeKind = 'today' | '7d' | '30d' | 'month' | 'custom'
export interface DateRange { from: string; to: string }

/** 00:00 (giờ VN) của ngày chứa `ms`, dạng mili-giây UTC. */
const startOfDay = (ms: number) => Math.floor((ms + OFFSET) / DAY) * DAY - OFFSET
const iso = (ms: number) => new Date(ms).toISOString()

/** [from, to): `to` là đầu ngày hôm sau (bao gồm cả hôm nay). */
export function presetRange(kind: Exclude<RangeKind, 'custom'>, now = Date.now()): DateRange {
  const today = startOfDay(now)
  if (kind === 'today') return { from: iso(today), to: iso(today + DAY) }
  if (kind === '7d') return { from: iso(today - 6 * DAY), to: iso(today + DAY) }
  if (kind === '30d') return { from: iso(today - 29 * DAY), to: iso(today + DAY) }
  const d = new Date(today + OFFSET) // ngày 1 của tháng này (tính trên đồng hồ VN)
  return { from: iso(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - OFFSET), to: iso(today + DAY) }
}

/** Khoảng liền trước, cùng độ dài (để so sánh kỳ trước). */
export function previousRange(r: DateRange): DateRange {
  const len = Date.parse(r.to) - Date.parse(r.from)
  return { from: iso(Date.parse(r.from) - len), to: r.from }
}

/** Khoảng tuỳ chọn từ hai ngày yyyy-mm-dd (theo giờ VN), gồm cả ngày cuối. Null nếu sai thứ tự / sai định dạng. */
export function customRange(fromDay: string, toDay: string): DateRange | null {
  const from = Date.parse(`${fromDay}T00:00:00+07:00`), to = Date.parse(`${toDay}T00:00:00+07:00`) + DAY
  return Number.isNaN(from) || Number.isNaN(to) || to <= from ? null : { from: iso(from), to: iso(to) }
}
