import { create } from 'zustand'
import type { NotifyLevel } from '../types/notify'

export interface ToastAction { label: string; run: () => void }
export interface ToastItem {
  id: number
  level: NotifyLevel
  title: string
  body?: string
  /** cùng khoá = cùng loại + cùng đối tượng -> gộp thành "x3" */
  key: string
  count: number
  /** tăng mỗi lần gộp: làm đồng hồ tự tắt chạy lại */
  bump: number
  action?: ToastAction
}

/** Số toast hiện cùng lúc; phần còn lại xếp hàng chờ. */
export const MAX_VISIBLE = 3
/** Thời gian tự tắt (ms); null = không tự tắt (CRITICAL). */
export const AUTO_DISMISS: Record<NotifyLevel, number | null> = { INFO: 5000, SUCCESS: 5000, WARNING: 10000, CRITICAL: null }

interface ToastState {
  items: ToastItem[] // theo thứ tự vào; MAX_VISIBLE đầu tiên đang hiện
  push: (t: Omit<ToastItem, 'id' | 'count' | 'bump'>) => void
  dismiss: (id: number) => void
}

let next = 1
export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (t) => set((s) => {
    const same = s.items.find((x) => x.key === t.key)
    if (same) return { items: s.items.map((x) => (x === same ? { ...x, count: x.count + 1, bump: x.bump + 1, action: t.action ?? x.action } : x)) }
    return { items: [...s.items, { ...t, id: next++, count: 1, bump: 0 }] }
  }),
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}))
