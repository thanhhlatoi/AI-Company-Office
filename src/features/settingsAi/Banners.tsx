import { AlertTriangle, Info, Lock, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SettingsAi } from '../../types/settingsAi'
import { useRestartPending } from './hooks'

function Banner({ tone, icon, children }: { tone: 'info' | 'warn'; icon: ReactNode; children: ReactNode }) {
  const c = tone === 'warn' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-sky-300 bg-sky-50 text-sky-950'
  return <div role="status" className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${c}`}><span className="mt-0.5 shrink-0" aria-hidden>{icon}</span><div>{children}</div></div>
}

/** Các banner đầu trang. Chữ + biểu tượng, không chỉ dựa vào màu. */
export function Banners({ s }: { s: SettingsAi }) {
  const restart = useRestartPending((x) => x.pending)
  return (
    <div className="space-y-2">
      {s.authEnabled !== true && <Banner tone="warn" icon={<AlertTriangle size={16} />}><strong>Chưa có đăng nhập:</strong> chỉ dùng trong mạng LAN tin cậy.</Banner>}
      {s.source === 'env' && <Banner tone="info" icon={<Lock size={16} />}>Cấu hình đang lấy từ tệp <code>.env</code>/<code>application.yml</code> của BE, chỉ xem được. Sửa ở máy chủ rồi khởi động lại BE.</Banner>}
      {restart && <Banner tone="warn" icon={<RotateCw size={16} />}>Đã lưu. Cần khởi động lại BE để có hiệu lực.</Banner>}
      {s.llm.provider === 'fake' && <Banner tone="warn" icon={<Info size={16} />}>Đang dùng <strong>AI GIẢ</strong>, hệ thống trả lời mẫu, không gọi AI thật.</Banner>}
    </div>
  )
}
