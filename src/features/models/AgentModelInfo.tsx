import { CircleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataClassBadge } from '../../components/studio/badges'
import { PRIVACY_INFO } from '../studio/modelRules'
import { useModelPolicy, useModelProfiles } from '../studio/queries'

/** Trong panel agent: model đang dùng kèm nhãn LOCAL/CLOUD; nếu không có model hợp lệ thì dải cảnh báo nêu rõ ràng buộc nào chặn. */
export function AgentModelInfo({ agentId, fallback }: { agentId: string; fallback: string }) {
  const p = useModelPolicy(agentId).data, models = useModelProfiles().data ?? []
  const m = models.find((x) => x.id === p?.resolved.modelId)
  return (
    <>
      <dt className="text-slate-600">Model</dt>
      <dd className="flex flex-wrap items-center gap-1.5">{m ? <>{m.label}<DataClassBadge value={m.dataClass} /></> : p ? <span className="font-semibold text-red-800">Không có model hợp lệ</span> : fallback}
        {p && p.privacy !== 'ANY' && <span className="text-xs text-slate-700">({PRIVACY_INFO[p.privacy].label})</span>}</dd>
      {p && !m && (
        <dd className="col-span-2 flex gap-2 rounded-card border border-red-300 bg-red-50 p-2 text-sm text-red-950" role="alert">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>Task của agent này sẽ chờ vì ràng buộc: {p.resolved.blockedBy || 'chưa chọn model'}. <Link to={`/agents/${agentId}/studio?tab=model`} className="underline">Sửa ở tab Model</Link> hoặc xem <Link to="/models" className="underline">hồ sơ model</Link>.</span>
        </dd>
      )}
    </>
  )
}
