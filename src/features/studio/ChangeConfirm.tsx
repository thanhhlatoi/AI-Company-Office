import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import type { ChangeFlow } from './useChangeFlow'

/** Hộp xác nhận cuối của luồng đổi quyền: "Sau thay đổi agent này sẽ có thể…" + lý do + (hai bước với MONEY/DESTRUCTIVE). */
export function ChangeConfirm({ flow, onClose }: { flow: ChangeFlow; onClose: () => void }) {
  if (!flow.pending) return null
  return (
    <TwoStepConfirm
      title="Xác nhận thay đổi quyền" twoStep={flow.twoStep} busy={flow.busy} confirmLabel="Lưu quyền"
      preview={<><p className="mb-1 text-sm font-semibold">Sau thay đổi agent này sẽ có thể…</p><ul className="space-y-1 text-sm">{flow.lines.map((l, i) => <li key={i} className="break-words">{l}</li>)}</ul></>}
      onClose={() => { flow.cancel(); onClose() }} onConfirm={(reason) => flow.commit(reason)}
    />
  )
}
