import { KeyRound } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { getOwnerToken, setOwnerToken, subscribeOwnerToken } from '../../lib/ownerToken'
import type { SettingsAi } from '../../types/settingsAi'

/**
 * Ô nhập mã chủ (BE: OWNER_TOKEN) để SỬA cài đặt AI. Mã chỉ giữ trong phiên trình duyệt này và chỉ gửi tới /settings/ai.
 * Ô nhập bị xoá ngay khi bấm Dùng mã; BE từ chối mã (401) thì mã tự bị xoá và ô hiện lại.
 */
export function OwnerTokenBar({ s }: { s: SettingsAi }) {
  const token = useSyncExternalStore(subscribeOwnerToken, getOwnerToken)
  const [value, setValue] = useState('')
  if (s.authEnabled !== true || s.source !== 'database') return null

  if (token) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
        <KeyRound size={16} aria-hidden />
        <span>Đã nhập mã chủ cho phiên này, có thể sửa và lưu. Mã không được lưu lại sau khi đóng tab.</span>
        <button onClick={() => setOwnerToken(null)} className="ml-auto rounded-lg border border-emerald-400 px-2.5 py-1 text-xs hover:bg-emerald-100">Xoá mã</button>
      </div>
    )
  }
  const submit = () => { if (value.trim()) { setOwnerToken(value); setValue('') } }
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <KeyRound size={16} aria-hidden />
      <label htmlFor="owner-token" className="font-medium">Mã chủ</label>
      <input
        id="owner-token" type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder="OWNER_TOKEN trong .env của BE"
        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 focus:border-brand focus:outline-none"
      />
      <button type="submit" disabled={!value.trim()} className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark disabled:opacity-50">Dùng mã</button>
      <p className="w-full text-xs">Cần mã này mới lưu được thay đổi. Xem chỉ cần không có mã.</p>
    </form>
  )
}
