import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ComparePanel } from '../features/models/ComparePanel'

export default function ModelComparePage() {
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex items-center gap-2"><Link to="/models" aria-label="Về hồ sơ model" className="rounded p-1 hover:bg-slate-100"><ArrowLeft size={18} /></Link><h1 className="text-xl font-bold">So sánh model</h1></header>
      <ComparePanel />
    </div>
  )
}
