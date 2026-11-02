import { useState, type ReactNode } from 'react'
import { foldVi } from '../../lib/text'
import { Modal } from '../Modal'

export const CONFIRM_PHRASE = 'XÁC NHẬN'
const BTN = 'rounded-lg px-3 py-1.5 text-sm font-medium'

interface Props {
  title: string
  /** Bước 1: xem trước ("Sau thay đổi agent này sẽ có thể...") */
  preview: ReactNode
  /** true (MONEY / DESTRUCTIVE): thêm bước 2, phải gõ lại cụm xác nhận */
  twoStep?: boolean
  /** Ô lý do (tuỳ chọn); `reasonRequired` bắt buộc nhập */
  askReason?: boolean
  reasonRequired?: boolean
  confirmLabel?: string
  busy?: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}

/** Hộp xác nhận cho thao tác đổi quyền: xem trước -> (lý do) -> (gõ cụm xác nhận với mức rủi ro cao). */
export function TwoStepConfirm({ title, preview, twoStep = false, askReason = true, reasonRequired = false, confirmLabel = 'Xác nhận', busy = false, onConfirm, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')
  const okReason = !reasonRequired || reason.trim().length > 0
  const okTyped = foldVi(typed.trim()) === foldVi(CONFIRM_PHRASE)
  const last = !twoStep || step === 2
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3 text-sm">
        {step === 1 ? (
          <>
            <div className="rounded-lg bg-slate-50 p-3">{preview}</div>
            {askReason && (
              <label className="block">
                <span className="font-medium">Lý do {reasonRequired ? '(bắt buộc)' : '(tuỳ chọn)'}</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
              </label>
            )}
          </>
        ) : (
          <label className="block">
            <span className="font-medium">Thay đổi này ở mức rủi ro cao. Gõ <b>{CONFIRM_PHRASE}</b> để tiếp tục.</span>
            <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" aria-label={`Gõ ${CONFIRM_PHRASE}`} />
          </label>
        )}
        <div className="flex justify-end gap-2">
          {step === 2 && <button className={`${BTN} border border-slate-300`} onClick={() => setStep(1)}>Quay lại</button>}
          <button className={`${BTN} border border-slate-300`} onClick={onClose}>Huỷ</button>
          <button
            disabled={busy || !okReason || (step === 2 && !okTyped)}
            onClick={() => (last ? onConfirm(reason.trim()) : setStep(2))}
            className={`${BTN} bg-brand text-white disabled:opacity-50`}
          >{last ? confirmLabel : 'Tiếp tục'}</button>
        </div>
      </div>
    </Modal>
  )
}
