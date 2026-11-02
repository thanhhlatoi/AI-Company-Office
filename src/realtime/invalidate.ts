import type { QueryClient } from '@tanstack/react-query'

const timers = new Map<string, ReturnType<typeof setTimeout>>()

/** Làm mới cache có chọn lọc, gộp nhiều sự kiện dồn dập thành một lần (task.* đến liên tục khi hệ thống bận). */
export function softInvalidate(qc: QueryClient, key: string, ms = 400) {
  if (timers.has(key)) return
  timers.set(key, setTimeout(() => { timers.delete(key); void qc.invalidateQueries({ queryKey: [key] }) }, ms))
}
