import { useRef, useState } from 'react'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { describeError } from './errors'
import { useSaveSettings } from './hooks'

/**
 * Khoá API OmniRoute, GHI MỘT CHIỀU: chỉ biết "đã đặt/chưa đặt". Khoá không đi vào nháp chung, không lưu ở đâu cả:
 * ô nhập được xoá NGAY khi bấm gửi (trước cả khi có phản hồi). Gửi lỗi thì phải nhập lại.
 */
const CFG = {
  omniroute: { label: 'Khoá API OmniRoute', id: 'omni-key', patch: (v: string | null) => ({ omniroute: { apiKey: v } }), delText: 'Sau khi xoá, nếu OmniRoute yêu cầu khoá thì BE sẽ không gọi được và agent báo lỗi LLM_UNAVAILABLE. Không hoàn tác được (phải nhập lại khoá).', readOnlyText: 'Khoá do tệp .env của BE quản lý, không đổi được từ giao diện.' },
  hermes: { label: 'Token admin Hermes', id: 'hermes-key', patch: (v: string | null) => ({ hermes: { adminToken: v } }), delText: 'Sau khi xoá, BE không tạo, sửa hay restart bot trên Hermes được cho tới khi nhập lại token. Không hoàn tác được.', readOnlyText: 'Token do tệp .env của BE quản lý, không đổi được từ giao diện.' },
} as const

export function KeyField({ field = 'omniroute', isSet, readOnly }: { field?: keyof typeof CFG; isSet: boolean; readOnly: boolean }) {
  const cfg = CFG[field]
  const { save, isPending } = useSaveSettings()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const inFlight = useRef(false)

  const send = async (apiKey: string | null) => {
    if (inFlight.current) return
    inFlight.current = true
    setMsg(null)
    setValue(''); setOpen(false); setConfirmDel(false) // xoá khỏi state trước khi chờ phản hồi
    try {
      await save(cfg.patch(apiKey))
      setMsg({ ok: true, text: apiKey === null ? 'Đã xoá khoá.' : 'Đã lưu khoá.' })
    } catch (e) {
      const d = describeError(e)
      setMsg({ ok: false, text: `Không lưu được khoá${apiKey === null ? '' : ' (hãy nhập lại)'}: ${d.message}${d.requestId ? ` (mã tra log: ${d.requestId})` : ''}` })
    } finally { inFlight.current = false }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{cfg.label}</p>
      <p className="text-sm" aria-live="polite">
        {isSet ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-900">✔ Đã đặt ●●●●</span> : <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">Chưa đặt</span>}
        <span className="ml-2 text-xs text-slate-600">Giá trị khoá không bao giờ hiện lại.</span>
      </p>
      {readOnly ? <p className="text-xs text-slate-600">{cfg.readOnlyText}</p> : (
        <>
          {open ? (
            <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (value) void send(value) }}>
              <label className="sr-only" htmlFor={cfg.id}>{cfg.label} mới</label>
              <input id={cfg.id} type="password" autoComplete="off" data-1p-ignore data-lpignore="true" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Dán giá trị mới" className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button type="submit" disabled={!value || isPending} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Lưu khoá</button>
              <button type="button" onClick={() => { setValue(''); setOpen(false) }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Huỷ</button>
            </form>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setOpen(true)} disabled={isPending} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">{isSet ? 'Đổi khoá' : 'Đặt khoá'}</button>
              {isSet && <button onClick={() => setConfirmDel(true)} disabled={isPending} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-800 hover:bg-red-50 disabled:opacity-50">Xoá khoá</button>}
            </div>
          )}
        </>
      )}
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-emerald-900' : 'text-red-800'}`}>{msg.ok ? '✔' : '⚠'} {msg.text}</p>}
      {confirmDel && (
        <TwoStepConfirm title={`Xoá: ${cfg.label}`} askReason={false} confirmLabel="Xoá khoá" busy={isPending} onClose={() => setConfirmDel(false)} onConfirm={() => void send(null)}
          preview={<p>{cfg.delText}</p>} />
      )}
    </div>
  )
}
