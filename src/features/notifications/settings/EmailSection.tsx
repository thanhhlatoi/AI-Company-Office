import { useState, type FormEvent } from 'react'
import type { NotificationSettings } from '../../../types/notify'
import { useChannel, useEmailSet, useEmailVerify } from './hooks'

const BTN = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'
const INPUT = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none'

/** Email: nhập địa chỉ -> gửi thư xác minh -> nhập mã -> gửi thư thử. */
export function EmailSection({ email }: { email: NotificationSettings['email'] }) {
  const set = useEmailSet()
  const verify = useEmailVerify()
  const { test, unlink } = useChannel('email')
  const [address, setAddress] = useState('')
  const [code, setCode] = useState('')
  const submit = (f: (e: FormEvent) => void) => (e: FormEvent) => { e.preventDefault(); f(e) }
  return (
    <section aria-labelledby="em" className="rounded-card border border-slate-300 bg-white p-4">
      <h2 id="em" className="text-lg font-semibold">Email</h2>
      {email.status === 'VERIFIED' ? (
        <div className="mt-2 space-y-3">
          <p className="text-sm">Đã xác minh: <b>{email.address}</b></p>
          <div className="flex gap-2">
            <button onClick={() => test.mutate()} disabled={test.isPending} className={`${BTN} bg-brand text-white hover:bg-brand-dark`}>{test.isPending ? 'Đang gửi…' : 'Gửi thư thử'}</button>
            <button onClick={() => unlink.mutate()} className={`${BTN} border border-red-300 text-red-700 hover:bg-red-50`}>Gỡ email</button>
          </div>
        </div>
      ) : email.status === 'PENDING' ? (
        <form onSubmit={submit(() => verify.mutate(code.trim()))} className="mt-2 space-y-2">
          <label className="block text-sm" htmlFor="em-code">Đã gửi mã xác minh tới <b>{email.address}</b>. Nhập mã:</label>
          <div className="flex gap-2">
            <input id="em-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" className={`${INPUT} w-40 font-mono`} aria-invalid={verify.isError} />
            <button type="submit" disabled={!code.trim() || verify.isPending} className={`${BTN} bg-brand text-white hover:bg-brand-dark`}>Xác nhận</button>
            <button type="button" onClick={() => unlink.mutate()} className={`${BTN} hover:bg-slate-100`}>Đổi địa chỉ</button>
          </div>
          {verify.isError && <p role="alert" className="text-sm text-red-700">Mã không đúng, hãy thử lại.</p>}
        </form>
      ) : (
        <form onSubmit={submit(() => set.mutate(address.trim()))} className="mt-2 space-y-2">
          <label className="block text-sm" htmlFor="em-addr">Địa chỉ nhận thông báo</label>
          <div className="flex gap-2">
            <input id="em-addr" type="email" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ban@congty.vn" className={`${INPUT} min-w-0 flex-1`} />
            <button type="submit" disabled={!address.trim() || set.isPending} className={`${BTN} bg-brand text-white hover:bg-brand-dark`}>{set.isPending ? 'Đang gửi…' : 'Gửi thư xác minh'}</button>
          </div>
        </form>
      )}
    </section>
  )
}
