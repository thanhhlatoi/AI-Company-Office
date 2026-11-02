import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AUTO_DISMISS, MAX_VISIBLE, useToastStore, type ToastItem } from '../store/toastStore'
import { NOTIFY_STYLE } from './notifyStyle'

function Toast({ t }: { t: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const [hover, setHover] = useState(false)
  const left = useRef<number | null>(AUTO_DISMISS[t.level]) // thời gian còn lại; giữ qua các lần rê chuột
  const { Icon, label, box } = NOTIFY_STYLE[t.level]

  useEffect(() => { left.current = AUTO_DISMISS[t.level] }, [t.bump, t.level]) // gộp thêm: đếm lại từ đầu
  useEffect(() => {
    if (hover || left.current === null) return // đang rê chuột (tạm dừng) hoặc CRITICAL
    const start = Date.now()
    const h = setTimeout(() => dismiss(t.id), left.current)
    return () => { clearTimeout(h); left.current = (left.current ?? 0) - (Date.now() - start) }
  }, [hover, t.bump, t.id, dismiss])

  return (
    <div role={t.level === 'CRITICAL' ? 'alert' : 'status'} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      className={`toast-in pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2 rounded-card border-2 p-3 shadow-xl ${box}`}>
      <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="sr-only">{label}: </span>
          <b className="break-words">{t.title}</b>
          {t.count > 1 && <span className="shrink-0 rounded-full bg-slate-900 px-1.5 text-xs font-bold text-white" aria-label={`${t.count} lần`}>x{t.count}</span>}
        </div>
        {t.body && <p className="mt-0.5 break-words text-xs opacity-80">{t.body}</p>}
        {t.action && <button onClick={() => { t.action?.run(); dismiss(t.id) }} className="mt-1.5 rounded-lg bg-white/70 px-2.5 py-1 text-xs font-semibold underline hover:bg-white">{t.action.label}</button>}
      </div>
      <button aria-label="Đóng thông báo" onClick={() => dismiss(t.id)} className="shrink-0 rounded p-0.5 hover:bg-black/10"><X size={16} /></button>
    </div>
  )
}

/** Tối đa 3 toast hiện cùng lúc, phần còn lại xếp hàng. Toast do notification.created và các phản hồi thao tác tạo ra. */
export function ToastHost() {
  const items = useToastStore((s) => s.items)
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {items.slice(0, MAX_VISIBLE).map((t) => <Toast key={t.id} t={t} />)}
    </div>
  )
}
