import { useState } from 'react'
import { DataClassBadge } from '../../components/studio/badges'
import { timeAgo } from '../../lib/time'
import type { ModelProfile } from '../../types/models'
import { ModelInfo } from '../studio/ModelInfo'
import { useCheckModel } from './modelMutations'

/** Một hồ sơ model: thông tin + lần kiểm gần nhất + lỗi liên tiếp + thanh "đang dùng x/y" + hành động. */
export function ProfileCard({ m, onEdit, onTest }: { m: ModelProfile; onEdit: () => void; onTest: () => void }) {
  const check = useCheckModel()
  const [res, setRes] = useState<string | null>(null)
  const pct = Math.min(100, Math.round((m.inUse / Math.max(1, m.maxConcurrent)) * 100))
  const down = m.health.status === 'DOWN'
  return (
    <li className={`flex flex-col gap-2 rounded-card border p-3 ${down ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <ModelInfo m={m} />
      <p className="text-xs text-slate-700">{m.provider} · <span className="font-mono">{m.modelId}</span> · kiểm gần nhất {m.health.checkedAt ? timeAgo(m.health.checkedAt) : 'chưa kiểm'}{m.health.consecutiveErrors > 0 && <b className="text-red-800"> · {m.health.consecutiveErrors} lỗi liên tiếp</b>}</p>
      <div><div className="flex justify-between text-xs"><span>Đang dùng</span><span>{m.inUse}/{m.maxConcurrent}</span></div>
        <div role="progressbar" aria-label={`Đang dùng ${m.inUse} trên ${m.maxConcurrent}`} aria-valuenow={m.inUse} aria-valuemin={0} aria-valuemax={m.maxConcurrent} className="mt-0.5 h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full ${pct >= 90 ? 'bg-red-700' : pct >= 70 ? 'bg-amber-700' : 'bg-green-700'}`} style={{ width: `${pct}%` }} /></div></div>
      {down && <p role="status" className="text-xs font-bold text-red-800">Model này đang không dùng được.</p>}
      {res && <p role="status" className="text-xs">{res}</p>}
      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200 pt-2 text-sm">
        <button onClick={onEdit} className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50">Sửa</button>
        <button disabled={check.isPending} onClick={() => check.mutate(m.id, { onSuccess: (r) => setRes(r.ok ? `Kết nối tốt (${r.latencyMs} ms)` : `Lỗi: ${r.error}`) })} className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50 disabled:opacity-50">{check.isPending ? 'Đang kiểm…' : 'Kiểm tra kết nối'}</button>
        <button onClick={onTest} className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50">Thử prompt</button>
        <span className="ml-auto"><DataClassBadge value={m.dataClass} /></span>
      </div>
    </li>
  )
}
