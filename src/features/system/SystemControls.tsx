import { Pause, Play } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { useWorkStore } from '../../store/workStore'
import { useSystemControl, useSystemStats } from './hooks'

/** Nút "Dừng tất cả" (đỏ, có xác nhận) hoặc "Tiếp tục", đặt ở thanh trên cùng. */
export function SystemButton() {
  const paused = useWorkStore((s) => s.system.state === 'PAUSED')
  const { pause, resume } = useSystemControl()
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  if (paused) {
    return (
      <button onClick={() => resume.mutate()} disabled={resume.isPending} className="flex items-center gap-1 rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">
        <Play size={16} aria-hidden="true" /> {resume.isPending ? 'Đang gửi…' : 'Tiếp tục'}
      </button>
    )
  }
  return (
    <>
      <button onClick={() => setConfirming(true)} className="flex items-center gap-1 rounded-lg border-2 border-red-500 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50">
        <Pause size={16} aria-hidden="true" /> <span className="hidden md:inline">Dừng tất cả</span>
      </button>
      {confirming && (
        <Modal title="Dừng tất cả?" onClose={() => setConfirming(false)}>
          <p className="text-sm">Hệ thống sẽ <b>không bắt đầu việc mới</b>. Việc đang chạy vẫn tự kết thúc. Bạn có thể bấm "Tiếp tục" bất cứ lúc nào.</p>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium">Lý do (tuỳ chọn)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setConfirming(false)} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Không dừng</button>
            <button disabled={pause.isPending} onClick={() => pause.mutate(reason.trim() || undefined, { onSuccess: () => { setConfirming(false); setReason('') } })} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {pause.isPending ? 'Đang dừng…' : 'Dừng tất cả'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

/** Banner vàng khi hệ thống đang tạm dừng + dải chỉ số (đang chạy / chờ / chờ duyệt / lỗi hôm nay). */
export function SystemBar() {
  const { state, reason } = useWorkStore((s) => s.system)
  const st = useSystemStats()
  const { resume } = useSystemControl()
  return (
    <>
      {state === 'PAUSED' && (
        <div role="status" className="flex items-center justify-center gap-3 bg-yellow-400 px-4 py-1.5 text-sm font-semibold text-yellow-950">
          <span>Hệ thống đang tạm dừng{reason ? `: ${reason}` : ''}. Việc mới sẽ không bắt đầu.</span>
          <button onClick={() => resume.mutate()} disabled={resume.isPending} className="rounded bg-yellow-950 px-3 py-0.5 text-xs font-bold text-yellow-50 hover:bg-yellow-900 disabled:opacity-50">Tiếp tục</button>
        </div>
      )}
      <dl aria-label="Chỉ số hệ thống" className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-0.5 border-b border-slate-200 bg-slate-50 px-4 py-1 text-xs text-slate-600">
        <div className="flex gap-1"><dt>Đang chạy</dt><dd className="font-bold tabular-nums text-blue-700">{st.running}</dd></div>
        <div className="flex gap-1"><dt>Đang chờ</dt><dd className="font-bold tabular-nums text-slate-800">{st.queued}</dd></div>
        <div className="flex gap-1"><dt>Chờ duyệt</dt><dd className={`font-bold tabular-nums ${st.awaiting ? 'text-amber-700' : 'text-slate-800'}`}>{st.awaiting}</dd></div>
        <div className="flex gap-1"><dt>Lỗi hôm nay</dt><dd className={`font-bold tabular-nums ${st.failedToday ? 'text-red-700' : 'text-slate-800'}`}>{st.failedToday}</dd></div>
      </dl>
    </>
  )
}
