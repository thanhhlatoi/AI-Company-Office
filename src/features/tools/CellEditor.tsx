import { ChangeConfirm } from '../studio/ChangeConfirm'
import { GrantDialog } from '../studio/GrantDialog'
import { useGrants } from '../studio/queries'
import { changeOf } from '../studio/grantRules'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { useChangeFlow } from '../studio/useChangeFlow'
import type { Tool } from '../../types/tools'

/** Mở từ một ô của ma trận quyền: chỉnh quyền (hộp thoại phạm vi) hoặc, nếu chưa cấp, cấp mới; có nút thu hồi. */
export function CellEditor({ agentId, agentName, tool, onClose }: { agentId: string; agentName: string; tool: Tool; onClose: () => void }) {
  const flow = useChangeFlow(agentId, () => {}, onClose)
  const grants = useGrants(agentId)
  if (!grants.data) return null
  const existing = grants.data.find((g) => g.toolId === tool.id)
  const blocked = !tool.enabled ? 'Công cụ đang bị tắt khẩn cấp' : tool.requiresAdminFlag && !tool.adminFlagOn && !existing ? 'Cần bật cờ xác nhận ở mục Danh mục công cụ trước' : null
  if (blocked) return <TwoStepConfirm title={`${agentName} — ${tool.name}`} askReason={false} confirmLabel="Đã hiểu" preview={<p className="text-sm">{blocked}.</p>} onClose={onClose} onConfirm={onClose} />
  return (
    <>
      <GrantDialog tool={tool} existing={existing} flow={flow} onClose={onClose} />
      {existing && !flow.pending && <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2"><button onClick={() => flow.start(changeOf([], [tool.id]))} className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white shadow-lg">Thu hồi quyền của {agentName}</button></div>}
      <ChangeConfirm flow={flow} onClose={onClose} />
    </>
  )
}
