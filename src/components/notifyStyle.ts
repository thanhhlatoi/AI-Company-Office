import { CircleAlert, CircleCheck, Info, OctagonAlert, type LucideIcon } from 'lucide-react'
import type { NotifyLevel } from '../types/notify'

/** Nguồn DUY NHẤT màu + biểu tượng + nhãn chữ của 4 mức thông báo (toast, ngăn thông báo, cài đặt). */
export const NOTIFY_STYLE: Record<NotifyLevel, { Icon: LucideIcon; label: string; box: string; text: string }> = {
  INFO: { Icon: Info, label: 'Thông tin', box: 'border-sky-300 bg-sky-50 text-sky-950', text: 'text-sky-700' },
  SUCCESS: { Icon: CircleCheck, label: 'Thành công', box: 'border-green-300 bg-green-50 text-green-950', text: 'text-green-700' },
  WARNING: { Icon: CircleAlert, label: 'Cảnh báo', box: 'border-amber-400 bg-amber-50 text-amber-950', text: 'text-amber-700' },
  CRITICAL: { Icon: OctagonAlert, label: 'Nghiêm trọng', box: 'border-red-400 bg-red-50 text-red-950', text: 'text-red-700' },
}
