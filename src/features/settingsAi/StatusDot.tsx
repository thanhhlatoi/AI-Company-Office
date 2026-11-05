import { CircleCheck, CircleHelp, CircleX, TriangleAlert } from 'lucide-react'
import type { Health } from '../../types/settingsAi'

const STYLE: Record<Health['state'], { label: string; cls: string; Icon: typeof CircleCheck }> = {
  up: { label: 'Hoạt động', cls: 'text-emerald-800', Icon: CircleCheck },
  degraded: { label: 'Chậm/lỗi một phần', cls: 'text-amber-800', Icon: TriangleAlert },
  down: { label: 'Không kết nối', cls: 'text-red-800', Icon: CircleX },
  unknown: { label: 'Chưa rõ', cls: 'text-slate-600', Icon: CircleHelp },
}

/** Trạng thái = biểu tượng + chữ + màu (không chỉ dựa vào màu). */
export function StatusDot({ state }: { state: Health['state'] }) {
  const { label, cls, Icon } = STYLE[state]
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${cls}`}><Icon size={14} aria-hidden />{label}</span>
}
