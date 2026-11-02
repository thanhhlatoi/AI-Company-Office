import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="grid h-full place-items-center text-center">
      <div>
        <h1 className="text-5xl font-bold text-brand-dark">404</h1>
        <p className="mt-2 text-slate-600">Không tìm thấy trang.</p>
        <Link to="/" className="mt-4 inline-block text-brand underline">Về văn phòng</Link>
      </div>
    </div>
  )
}
