import { formatDateTime } from '../../lib/time'
import { useProjectActivity } from './hooks'

/** Tab Nhật ký: sự kiện của dự án (mới nhất trước). */
export function LogTab({ id }: { id: string }) {
  const q = useProjectActivity(id)
  if (q.isLoading) return <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-slate-200" />)}</div>
  if (q.isError) return <p role="alert" className="text-sm text-red-700">Không tải được nhật ký. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
  if (!q.data?.length) return <p className="rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">Dự án chưa có sự kiện nào.</p>
  return (
    <ul className="divide-y divide-slate-100 rounded-card border border-slate-200 bg-white text-sm">
      {q.data.map((e) => <li key={e.id} className="flex gap-3 px-3 py-2"><time className="w-36 shrink-0 text-xs text-slate-600">{formatDateTime(e.at)}</time><span className={e.kind === 'error' ? 'font-medium text-red-700' : ''}>{e.kind === 'error' && <span className="mr-1 rounded bg-red-100 px-1 text-xs font-bold">LỖI</span>}{e.message}</span></li>)}
    </ul>
  )
}
