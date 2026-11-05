import { useEffect, useRef, useState } from 'react'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { confirmNotes, LABELS, toPatch } from './draft'
import { describeError } from './errors'
import { useSaveSettings } from './hooks'
import type { DraftForm } from './useDraft'

/** Thanh Lưu: số thay đổi chưa lưu, xác nhận khi đổi địa chỉ/chế độ, chặn bấm đúp, cảnh báo khi đóng tab. Ẩn khi source=env hoặc không có thay đổi. */
export function SaveBar({ f }: { f: DraftForm }) {
  const { save, isPending } = useSaveSettings()
  const [confirm, setConfirm] = useState<string[] | null>(null)
  const [err, setErr] = useState<ReturnType<typeof describeError> | null>(null)
  const inFlight = useRef(false)
  const n = f.keys.length

  useEffect(() => {
    if (n === 0) return
    const warn = (ev: BeforeUnloadEvent) => { ev.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [n])

  const doSave = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setErr(null)
    try { await save(toPatch(f.keys, f.draft)); f.reset() } catch (e) { setErr(describeError(e)) } finally { inFlight.current = false; setConfirm(null) }
  }
  const onSave = () => {
    const notes = confirmNotes(f.base, f.keys, f.draft)
    if (notes.length) setConfirm(notes)
    else void doSave()
  }

  if (f.readOnly || (n === 0 && !err)) return null
  const invalid = Object.keys(f.errors).length > 0
  return (
    <>
      <div className="sticky bottom-3 z-10 space-y-2 rounded-card border border-slate-300 bg-white p-3 shadow-lg">
        {err && <p role="alert" className="text-sm text-red-800">⚠ Không lưu được: {err.message}{err.requestId ? ` (mã tra log: ${err.requestId})` : ''}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium" aria-live="polite">{n} thay đổi chưa lưu{n > 0 ? `: ${f.keys.map((k) => LABELS[k]).join(', ')}` : ''}</span>
          <button onClick={f.reset} disabled={isPending || n === 0} className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">Bỏ thay đổi</button>
          <button onClick={onSave} disabled={isPending || invalid || n === 0} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">{isPending ? 'Đang lưu…' : `Lưu (${n})`}</button>
        </div>
        {invalid && <p className="text-xs text-red-800">Còn lỗi trong form, sửa xong mới lưu được.</p>}
      </div>
      {confirm && (
        <TwoStepConfirm title="Xác nhận thay đổi" askReason={false} confirmLabel="Lưu" busy={isPending} onClose={() => setConfirm(null)} onConfirm={() => void doSave()}
          preview={<ul className="list-disc space-y-1 pl-5">{confirm.map((x) => <li key={x}>{x}</li>)}</ul>} />
      )}
    </>
  )
}
