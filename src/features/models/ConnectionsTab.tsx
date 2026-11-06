import { useModelsOf, useProviderRows } from './gatewayHooks'
import { ProviderCard } from './ProviderCard'

/** Hồ sơ model THẬT: các nhà cung cấp đang nối qua 9Router. Mất kết nối thì chuyển sang "Không hoạt động". */
/** open/onOpen: nhà cung cấp đang xem chi tiết (ở ngăn bên phải, do ModelsPage giữ trong ?provider=). */
export function ConnectionsTab({ open, onOpen }: { open: string | null; onOpen: (name: string | null) => void }) {
  const { rows, loading, down, refetch, forget } = useProviderRows()
  const activeNames = rows.filter((r) => r.active).map((r) => r.name)
  const stats = useModelsOf(activeNames)
  const modelsOf = (name: string) => stats[activeNames.indexOf(name)]?.data
  const active = rows.filter((r) => r.active).length
  if (loading) return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-card bg-slate-200" />)}</div>
  return (
    <div className="space-y-4">
      {down && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không kết nối được 9Router (qua BE). Các mục bên dưới được giữ lại từ lần trước và đang <b>không hoạt động</b>. <button className="underline" onClick={refetch}>Thử lại</button></p>}
      {!down && rows.length === 0 && <p className="rounded-card border border-dashed border-slate-300 p-8 text-center text-sm text-slate-700">9Router chưa có nhà cung cấp nào (hoặc BE đang chạy provider=fake). Thêm kết nối trên dashboard 9Router rồi quay lại.</p>}
      {rows.length > 0 && <p className="text-sm text-slate-700"><b>{active}</b> hoạt động{rows.length - active > 0 && <> · <b>{rows.length - active}</b> không hoạt động</>} · tổng <b>{rows.reduce((n, r) => n + (r.active ? r.modelCount : 0), 0)}</b> model đang dùng được</p>}
      <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {rows.map((r) => <ProviderCard key={r.name} row={r} models={modelsOf(r.name)} selected={open === r.name} onSelect={() => onOpen(open === r.name ? null : r.name)} onForget={() => forget(r.name)} />)}
      </ul>
      <p className="text-xs text-slate-700">Nguồn: 9Router (làm mới mỗi 15 giây). Local = chạy trên máy bạn (Ollama Local, Local Device); còn lại là Cloud. Bấm “Xem chi tiết model” để mở ngăn bên phải.</p>
    </div>
  )
}
