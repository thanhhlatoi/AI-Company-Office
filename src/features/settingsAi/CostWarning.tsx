import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { safeHttpUrl } from './validate'

/** Cảnh báo chi phí khi đi qua OmniRoute. Cố ý KHÔNG có nút đóng: luôn hiện khi đang dùng OmniRoute. */
export function CostWarning({ dashboardUrl }: { dashboardUrl: string }) {
  const dash = safeHttpUrl(dashboardUrl)
  return (
    <div className="space-y-2 rounded-card border-2 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden /><span>
        <strong>Chi phí có thể bị ghi thấp hơn thực tế.</strong> Khi đi qua OmniRoute, BE chỉ ghi giá của nhà cung cấp mặc định (Ollama = 0). Nếu OmniRoute chuyển sang AI cloud tính phí, chi phí hiển thị trong AgentOffice
        <strong> SẼ THẤP HƠN THỰC TẾ</strong> và ngân sách <strong>KHÔNG chặn được</strong> khoản đó. Xem chi phí thật ở dashboard OmniRoute, hoặc khai giá model trong Chi phí → Bảng giá.
      </span></p>
      <div className="flex flex-wrap gap-2 pl-7">
        <Link to="/costs/prices" className="rounded-lg bg-amber-900 px-3 py-1 text-xs font-bold text-white">Mở Bảng giá model</Link>
        {dash && <a href={dash} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-amber-900 px-3 py-1 text-xs font-bold">Mở dashboard OmniRoute ↗</a>}
      </div>
    </div>
  )
}
