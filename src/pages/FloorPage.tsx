import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { listFloors } from '../api/floors'
import { FloorView } from '../features/floor/FloorView'

/** /floor/:slug — một tầng văn phòng. Tab tầng lấy từ GET /floors. `?debug=1` bật lưới/footprint, `?broken=1` (mock) thử trang lỗi, `?stress=60` (dev) 60 agent giả để đo hiệu năng. */
export default function FloorPage() {
  const { slug = '' } = useParams()
  const [q] = useSearchParams()
  const floors = useQuery({ queryKey: ['floors'], queryFn: listFloors })
  if (floors.data && !floors.data.some((f) => f.slug === slug)) return <Navigate to={`/floor/${floors.data[0]?.slug ?? 'tang-1'}`} replace />
  const tab = (on: boolean) => `flex min-h-10 items-center rounded-lg px-4 text-sm font-medium lg:min-h-0 lg:py-1.5 ${on ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`
  return (
    <div className="flex h-full flex-col">
      <h1 className="sr-only">Văn phòng theo tầng</h1>
      <nav aria-label="Tầng" className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-4 py-2">
        <Link to="/company" className={tab(false)}>Toàn công ty</Link>
        <Link to="/credits" className={`${tab(false)} order-last ml-auto`}>Ghi công</Link>
        {floors.data?.map((f) => <Link key={f.id} to={`/floor/${f.slug}`} aria-current={f.slug === slug ? 'page' : undefined} className={tab(f.slug === slug)}>{f.name}</Link>)}
      </nav>
      <div className="min-h-0 flex-1"><FloorView slug={slug} debug={q.get('debug') === '1'} broken={q.get('broken') === '1'} stress={Number(q.get('stress')) || 0} /></div>
    </div>
  )
}
