import { History } from 'lucide-react'
import { useState } from 'react'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { diffStats, lineDiff } from '../../lib/diff'
import { formatDateTime } from '../../lib/time'
import { DiffView } from './DiffView'
import { useRestoreVersion } from './mutations'
import { usePromptVersions } from './queries'

/** Lịch sử phiên bản prompt: chọn hai bản để so sánh, khôi phục = tạo phiên bản MỚI từ bản cũ (không mất lịch sử). */
export function PromptVersions({ agentId }: { agentId: string }) {
  const { data = [], isLoading, isError, refetch } = usePromptVersions(agentId)
  const [pick, setPick] = useState<string[]>([])
  const [restoring, setRestoring] = useState<string | null>(null)
  const restore = useRestoreVersion(agentId)
  if (isLoading) return <div className="h-24 animate-pulse rounded-card bg-slate-200" />
  if (isError) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được lịch sử. <button className="underline" onClick={() => void refetch()}>Thử lại</button></p>
  const [a, b] = pick.length === 2 ? pick.map((id) => data.find((v) => v.id === id)).sort((x, y) => (x?.version ?? 0) - (y?.version ?? 0)) : [data[1], data[0]] // mặc định: bản trước vs bản hiện tại
  const toggle = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p.slice(-1), id]))
  const target = data.find((v) => v.id === restoring)
  return (
    <section aria-label="Lịch sử phiên bản prompt" className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold"><History size={15} aria-hidden /> Phiên bản prompt</h3>
      {data.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Chưa có phiên bản nào. Lưu prompt để tạo phiên bản đầu tiên.</p>}
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
        {data.map((v, i) => (
          <li key={v.id} className="flex flex-wrap items-center gap-2 p-2 text-sm">
            <label className="flex min-w-0 flex-1 items-center gap-2">
              <input type="checkbox" checked={pick.includes(v.id)} onChange={() => toggle(v.id)} aria-label={`So sánh phiên bản ${v.version}`} />
              <span><b>v{v.version}</b>{i === 0 && <span className="ml-1 rounded bg-green-100 px-1.5 text-xs font-medium text-green-900">hiện tại</span>} · {v.note || 'không ghi chú'} <span className="text-xs text-slate-700">· {v.author} · {formatDateTime(v.createdAt)}</span></span>
            </label>
            {i > 0 && <button onClick={() => setRestoring(v.id)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Khôi phục</button>}
          </li>
        ))}
      </ul>
      {a && b && a.id !== b.id && <div><p className="mb-1 text-xs text-slate-700">So sánh v{a.version} → v{b.version}{pick.length < 2 && ' (mặc định; tick hai phiên bản để đổi)'}</p><DiffView oldText={a.prompt} newText={b.prompt} label={`Khác biệt v${a.version} và v${b.version}`} /></div>}
      {target && data[0] && (
        <TwoStepConfirm
          title={`Khôi phục phiên bản ${target.version}?`} confirmLabel="Khôi phục" busy={restore.isPending} askReason={false}
          preview={<p className="text-sm">Prompt hiện tại sẽ được thay bằng nội dung v{target.version} ({(() => { const s = diffStats(lineDiff(data[0].prompt, target.prompt)); return `thêm ${s.added}, bỏ ${s.removed} dòng` })()}). Bản hiện tại vẫn nằm trong lịch sử.</p>}
          onClose={() => setRestoring(null)} onConfirm={() => restore.mutate(target.id, { onSuccess: () => setRestoring(null) })}
        />
      )}
    </section>
  )
}
