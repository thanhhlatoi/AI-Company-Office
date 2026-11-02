import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { useAgentStore } from '../../store/agentStore'
import type { Task } from '../../types'
import { useAssign } from './hooks'

export type Pending = { kind: 'cancel'; task: Task } | { kind: 'redo'; task: Task; before: string | null } | { kind: 'assign'; task: Task } | null

const BTN = 'rounded-lg px-4 py-2 text-sm'

/** Các hộp thoại của bảng: xác nhận huỷ (thả vào vùng Huỷ), xác nhận làm lại (tạo task mới), đổi người phụ trách. */
export function BoardDialogs({ pending, close, onCancel, onRedo }: { pending: Pending; close: () => void; onCancel: (t: Task) => void; onRedo: (t: Task, before: string | null) => void }) {
  if (!pending) return null
  const { task } = pending
  if (pending.kind === 'assign') return <AssignDialog task={task} close={close} />
  const cancel = pending.kind === 'cancel'
  return (
    <Modal title={cancel ? 'Huỷ việc này?' : 'Làm lại (tạo task mới)?'} onClose={close}>
      <p className="text-sm">{cancel ? <>Huỷ <b>{task.title}</b>? Agent sẽ dừng việc này.</> : <>Tạo một task <b>mới</b> giống <b>{task.title}</b> và đưa vào cột Chờ. Task cũ giữ nguyên làm lịch sử.</>}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={close} className={`${BTN} hover:bg-slate-100`}>{cancel ? 'Giữ lại' : 'Không'}</button>
        <button onClick={() => { if (pending.kind === 'redo') onRedo(task, pending.before); else onCancel(task); close() }} className={`${BTN} text-white ${cancel ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'}`}>{cancel ? 'Huỷ việc' : 'Làm lại'}</button>
      </div>
    </Modal>
  )
}

function AssignDialog({ task, close }: { task: Task; close: () => void }) {
  const agents = Object.values(useAgentStore((s) => s.agentsById)).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const assign = useAssign()
  const [agentId, setAgentId] = useState(task.agentId)
  return (
    <Modal title="Đổi người phụ trách" onClose={close}>
      <label className="block text-sm"><span className="mb-1 block font-medium">{task.title}</span>
        <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">{agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.role}</option>)}</select>
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={close} className={`${BTN} hover:bg-slate-100`}>Huỷ</button>
        <button disabled={agentId === task.agentId || assign.isPending} onClick={() => assign.mutate({ id: task.id, agentId }, { onSuccess: close })} className={`${BTN} bg-brand text-white hover:bg-brand-dark disabled:opacity-50`}>{assign.isPending ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </Modal>
  )
}
