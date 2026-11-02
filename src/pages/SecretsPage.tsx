import { KeyRound, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KINDS } from '../features/secrets/kinds'
import { CreateDialog, DeleteDialog, RotateDialog } from '../features/secrets/SecretDialogs'
import { useSecrets } from '../features/studio/queries'
import { formatDateTime, timeAgo } from '../lib/time'
import type { Secret } from '../types/tools'

export default function SecretsPage() {
  const q = useSecrets()
  const [dlg, setDlg] = useState<{ kind: 'create' } | { kind: 'rotate' | 'delete'; s: Secret } | null>(null)
  const close = () => setDlg(null)
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="flex items-center gap-2 text-xl font-bold"><KeyRound size={20} aria-hidden />Bí mật</h1><p className="text-sm text-slate-700">Khoá API, mật khẩu, token. Giao diện chỉ thấy tên, loại và ngày — không bao giờ thấy giá trị. <Link to="/tools" className="underline">Về Công cụ và quyền</Link></p></div>
        <button onClick={() => setDlg({ kind: 'create' })} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark"><Plus size={14} aria-hidden />Tạo bí mật</button>
      </header>
      {q.isLoading && <div className="h-40 animate-pulse rounded-card bg-slate-200" />}
      {q.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>}
      {q.data && q.data.length === 0 && <p className="rounded-card border border-dashed border-slate-300 p-8 text-center text-sm text-slate-700">Chưa có bí mật nào. Tạo bí mật đầu tiên để cấp quyền gửi thư, đăng bài hoặc gọi API.</p>}
      {q.data && q.data.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left"><tr>{['Tên', 'Loại', 'Tạo', 'Xoay gần nhất', 'Dùng gần nhất', 'Đang dùng', ''].map((h) => <th key={h} scope="col" className="p-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {q.data.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <th scope="row" className="p-2 text-left font-medium">{s.name}</th><td className="p-2">{KINDS[s.kind as keyof typeof KINDS] ?? s.kind}</td>
                  <td className="p-2" title={formatDateTime(s.createdAt)}>{timeAgo(s.createdAt)}</td><td className="p-2">{s.rotatedAt ? timeAgo(s.rotatedAt) : 'Chưa'}</td><td className="p-2">{s.lastUsedAt ? timeAgo(s.lastUsedAt) : 'Chưa dùng'}</td>
                  <td className="p-2">{s.usedBy.length ? `${s.usedBy.length} quyền` : '—'}</td>
                  <td className="whitespace-nowrap p-2 text-right"><button onClick={() => setDlg({ kind: 'rotate', s })} className="rounded-lg border border-slate-300 px-2 py-1 hover:bg-slate-50">Xoay</button> <button onClick={() => setDlg({ kind: 'delete', s })} className="rounded-lg border border-red-300 px-2 py-1 text-red-800 hover:bg-red-50">Xoá</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dlg?.kind === 'create' && <CreateDialog onClose={close} />}
      {dlg?.kind === 'rotate' && <RotateDialog secret={dlg.s} onClose={close} />}
      {dlg?.kind === 'delete' && <DeleteDialog secret={dlg.s} onClose={close} />}
    </div>
  )
}
