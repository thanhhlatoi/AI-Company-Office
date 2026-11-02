import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { useUiStore } from '../../../store/uiStore'
import type { NotificationSettings } from '../../../types/notify'
import { useNow } from '../../approvals/hooks'
import { useChannel, useTelegramLink } from './hooks'

const BTN = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

function fmt(ms: number) { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

/** Ghép Telegram bằng mã dùng một lần. FE không bao giờ nhận hay hiển thị token bot. */
export function TelegramSection({ tg }: { tg: NotificationSettings['telegram'] }) {
  const link = useTelegramLink()
  const { test, unlink } = useChannel('telegram')
  const now = useNow()
  const [confirming, setConfirming] = useState(false)
  const was = useRef(tg.status)
  useEffect(() => { if (was.current === 'PENDING' && tg.status === 'VERIFIED') useUiStore.getState().toast('Đã ghép Telegram'); was.current = tg.status }, [tg.status])

  const code = link.data
  const left = code ? Date.parse(code.expiresAt) - now : null
  const expired = left !== null && left <= 0
  return (
    <section aria-labelledby="tg" className="rounded-card border border-slate-300 bg-white p-4">
      <h2 id="tg" className="text-lg font-semibold">Telegram</h2>
      {tg.status === 'VERIFIED' ? (
        <div className="mt-2 space-y-3">
          <p className="text-sm">Đã kết nối: <b>{tg.username}</b> qua bot <b>{tg.botName}</b>.</p>
          <div className="flex gap-2">
            <button onClick={() => test.mutate()} disabled={test.isPending} className={`${BTN} bg-brand text-white hover:bg-brand-dark`}>{test.isPending ? 'Đang gửi…' : 'Gửi tin thử'}</button>
            <button onClick={() => setConfirming(true)} className={`${BTN} border border-red-300 text-red-700 hover:bg-red-50`}>Gỡ kết nối</button>
          </div>
        </div>
      ) : tg.status === 'PENDING' ? (
        <div className="mt-2 space-y-3 text-sm" aria-live="polite">
          {code && !expired ? (
            <>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Mở Telegram, tìm bot <b>@{code.botName}</b>.</li>
                <li>Gửi tin: <code className="rounded bg-slate-100 px-2 py-1 font-mono text-base font-bold">/start {code.code}</code> <button onClick={() => void navigator.clipboard?.writeText(`/start ${code.code}`)} className="ml-1 text-xs text-brand underline">Sao chép</button></li>
              </ol>
              <p className="text-slate-600">Mã còn hiệu lực <b className="tabular-nums">{fmt(left ?? 0)}</b>. Trang tự nhận ra khi ghép xong.</p>
            </>
          ) : <p className="text-slate-600">{expired ? 'Mã đã hết hạn.' : 'Đang chờ ghép (mã đã tạo trước đó).'}</p>}
          <div className="flex gap-2">
            <button onClick={() => link.mutate()} disabled={link.isPending} className={`${BTN} border border-slate-300 hover:bg-slate-50`}>Tạo mã mới</button>
            <button onClick={() => unlink.mutate()} className={`${BTN} hover:bg-slate-100`}>Huỷ</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-slate-600">Nhận thông báo quan trọng qua Telegram. Bạn cần mở bot và gửi mã ghép (hiệu lực 10 phút).</p>
          <button onClick={() => link.mutate()} disabled={link.isPending} className={`${BTN} bg-brand text-white hover:bg-brand-dark`}>{link.isPending ? 'Đang tạo mã…' : 'Kết nối Telegram'}</button>
        </div>
      )}
      {confirming && (
        <Modal title="Gỡ kết nối Telegram?" onClose={() => setConfirming(false)}>
          <p className="text-sm">Bạn sẽ không còn nhận thông báo qua Telegram cho tới khi ghép lại.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setConfirming(false)} className={`${BTN} hover:bg-slate-100`}>Giữ lại</button>
            <button onClick={() => { unlink.mutate(); setConfirming(false) }} className={`${BTN} bg-red-600 text-white hover:bg-red-700`}>Gỡ kết nối</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
