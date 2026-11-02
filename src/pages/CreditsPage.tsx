import { useQuery } from '@tanstack/react-query'
import { creditsOf } from '../features/sprites/credits'
import { parseManifest } from '../features/sprites/manifest'

const fetchManifest = async () => {
  const res = await fetch(`${import.meta.env.BASE_URL}assets/manifest.json`)
  if (!res.ok) throw new Error(`Không tải được manifest (${res.status})`)
  return parseManifest(await res.json())
}

/** /credits — tự sinh từ public/assets/manifest.json. */
export default function CreditsPage() {
  const q = useQuery({ queryKey: ['assets-manifest'], queryFn: fetchManifest })
  const rows = q.data ? creditsOf(q.data) : []
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Ghi công tài nguyên</h1>
      {q.isLoading && <p>Đang tải…</p>}
      {q.isError && <p role="alert" className="text-red-700">{q.error.message}</p>}
      {q.data && !rows.length && <p className="text-slate-600">Chưa dùng gói tài nguyên ngoài nào. Hình nhân vật, đồ vật, sàn và tường hiện là hình tạm vẽ bằng code của dự án này.</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-medium">{r.name} {r.author && <span className="font-normal text-slate-600">— {r.author}</span>}</h2>
            <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
              <dt className="text-slate-500">Nguồn</dt>
              <dd>{r.sourceUrl ? <a className="text-brand underline" href={r.sourceUrl} target="_blank" rel="noreferrer noopener">{r.sourceUrl}</a> : '—'}</dd>
              <dt className="text-slate-500">Giấy phép</dt>
              <dd>{r.license || <span className="font-medium text-red-700">Chưa khai báo giấy phép</span>}</dd>
              <dt className="text-slate-500">Ghi công</dt>
              <dd>{r.attributionRequired ? 'Bắt buộc ghi công' : 'Không bắt buộc'}</dd>
              {r.provides.length > 0 && (<><dt className="text-slate-500">Cung cấp</dt><dd>{r.provides.join(', ')}</dd></>)}
              {r.notes && (<><dt className="text-slate-500">Ghi chú</dt><dd>{r.notes}</dd></>)}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}
