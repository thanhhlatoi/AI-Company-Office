import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../../components/Modal'
import { useAgentStore } from '../../store/agentStore'
import type { Secret } from '../../types/tools'
import { useTools } from '../studio/queries'
import { useSecretMutations } from '../studio/toolMutations'
import { KINDS } from './kinds'

const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'

/** Ô nhập bí mật: kiểu mật khẩu, không tự điền, không lưu trong URL/localStorage; giá trị bị xoá khỏi state ngay khi gửi. */
function SecretInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="password" autoComplete="new-password" spellCheck={false} aria-label="Giá trị bí mật" value={value} onChange={(e) => onChange(e.target.value)} className={field} />
}

export function CreateDialog({ onClose }: { onClose: () => void }) {
  const { create } = useSecretMutations()
  const [name, setName] = useState(''), [kind, setKind] = useState<keyof typeof KINDS>('email'), [value, setValue] = useState('')
  const submit = () => {
    const body = { name: name.trim(), kind, value }
    setValue('') // xoá khỏi bộ nhớ giao diện ngay khi gửi
    create.mutate(body, { onSuccess: onClose, onSettled: () => create.reset() }) // reset: react-query không giữ lại `variables` (có giá trị bí mật)
  }
  return (
    <Modal title="Tạo bí mật" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Tên<input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
        <label className="block">Loại<select className={field} value={kind} onChange={(e) => setKind(e.target.value as keyof typeof KINDS)}>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="block">Giá trị<SecretInput value={value} onChange={setValue} /></label>
        <p className="text-xs text-slate-700">Giá trị chỉ được gửi một chiều lên máy chủ và không bao giờ hiện lại. Hãy giữ bản sao ở nơi an toàn của bạn.</p>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-slate-100">Huỷ</button><button disabled={!name.trim() || !value || create.isPending} onClick={submit} className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-50">Tạo</button></div>
      </div>
    </Modal>
  )
}

export function RotateDialog({ secret, onClose }: { secret: Secret; onClose: () => void }) {
  const { rotate } = useSecretMutations()
  const [value, setValue] = useState('')
  const submit = () => { const v = value; setValue(''); rotate.mutate({ id: secret.id, value: v }, { onSuccess: onClose, onSettled: () => rotate.reset() }) }
  return (
    <Modal title={`Xoay bí mật: ${secret.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Giá trị mới<SecretInput value={value} onChange={setValue} /></label>
        <p className="text-xs text-slate-700">Các quyền đang dùng bí mật này sẽ dùng giá trị mới ngay. Giá trị cũ không còn dùng được.</p>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-slate-100">Huỷ</button><button disabled={!value || rotate.isPending} onClick={submit} className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-50">Xoay</button></div>
      </div>
    </Modal>
  )
}

/** Xoá bí mật: bị chặn nếu còn quyền tham chiếu — hiện danh sách đang dùng (cả khi BE trả 409 lúc đang xoá). */
export function DeleteDialog({ secret, onClose }: { secret: Secret; onClose: () => void }) {
  const { remove } = useSecretMutations()
  const agents = useAgentStore((s) => s.agentsById), tools = useTools().data ?? []
  const apiUsed = (remove.error as { body?: { usedBy?: Secret['usedBy'] } } | null)?.body?.usedBy
  const used = apiUsed ?? secret.usedBy
  return (
    <Modal title={`Xoá bí mật: ${secret.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        {used.length > 0 ? (
          <>
            <p role="alert" className="rounded-lg bg-red-50 p-2 font-medium text-red-900">Không xoá được: còn {used.length} quyền đang dùng bí mật này. Gỡ hoặc đổi chúng trước.</p>
            <ul className="space-y-1">{used.map((u, i) => <li key={i}><Link className="text-brand underline" to={`/agents/${u.agentId}/studio?tab=tools`}>{agents[u.agentId]?.name ?? u.agentId} — {tools.find((t) => t.id === u.toolId)?.name ?? u.toolId}</Link></li>)}</ul>
            <div className="flex justify-end"><button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2">Đóng</button></div>
          </>
        ) : (
          <>
            <p>Xoá vĩnh viễn bí mật này? Không có quyền nào đang dùng nó.</p>
            <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-slate-100">Huỷ</button><button disabled={remove.isPending} onClick={() => remove.mutate(secret.id, { onSuccess: onClose })} className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-50">Xoá</button></div>
          </>
        )}
      </div>
    </Modal>
  )
}
