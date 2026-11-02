import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { RiskChip } from '../../components/studio/badges'
import type { Grant, Tool } from '../../types/tools'
import { changeOf, newGrant } from './grantRules'
import { SchemaForm } from './SchemaForm'
import { validateScope } from './schemaForm'
import { useSecrets } from './queries'
import type { ChangeFlow } from './useChangeFlow'

const num = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
const toLocal = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')

/** Hộp thoại cấp / chỉnh quyền một công cụ: phạm vi (từ scopeSchema), giới hạn, hết hạn, "luôn yêu cầu duyệt". Lưu đi qua luồng xem trước + xác nhận. */
export function GrantDialog({ tool, existing, flow, onClose }: { tool: Tool; existing?: Grant; flow: ChangeFlow; onClose: () => void }) {
  const init = existing ? { toolId: tool.id, scope: existing.scope, limits: existing.limits, alwaysApprove: existing.alwaysApprove, secretId: existing.secretId ?? null } : newGrant(tool)
  const [g, setG] = useState(init)
  const [tried, setTried] = useState(false)
  const secrets = useSecrets().data ?? []
  const errors = validateScope(tool.scopeSchema, g.scope)
  const loosening = !!existing?.alwaysApprove && !g.alwaysApprove
  const setLimit = (k: 'maxCallsPerTask' | 'maxPerMinute') => (e: { target: { value: string } }) => setG({ ...g, limits: { ...g.limits, [k]: e.target.value === '' ? null : Math.max(1, Math.floor(Number(e.target.value))) } })
  const submit = () => { setTried(true); if (!Object.keys(errors).length) flow.start(changeOf([g])) }
  return (
    <Modal title={`${existing ? 'Chỉnh' : 'Cấp'} quyền: ${tool.name}`} onClose={() => !flow.pending && onClose()}>
      <div className="space-y-4">
        <p className="flex flex-wrap items-center gap-2 text-sm"><RiskChip risk={tool.risk} /><span className="text-slate-700">{tool.description}</span></p>
        <fieldset className="space-y-2"><legend className="mb-1 text-sm font-semibold">Phạm vi</legend>
          <SchemaForm schema={tool.scopeSchema} value={g.scope} onChange={(scope) => setG({ ...g, scope })} errors={tried ? errors : {}} secrets={secrets} />
        </fieldset>
        <fieldset className="space-y-2"><legend className="mb-1 text-sm font-semibold">Giới hạn</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm">Tối đa mỗi task<input type="number" min={1} className={num} value={g.limits.maxCallsPerTask ?? ''} onChange={setLimit('maxCallsPerTask')} placeholder="Không giới hạn" /></label>
            <label className="block text-sm">Tối đa mỗi phút<input type="number" min={1} className={num} value={g.limits.maxPerMinute ?? ''} onChange={setLimit('maxPerMinute')} placeholder="Không giới hạn" /></label>
          </div>
          <label className="block text-sm">Hết hạn quyền (tuỳ chọn)<input type="datetime-local" className={num} value={toLocal(g.limits.expiresAt)} onChange={(e) => setG({ ...g, limits: { ...g.limits, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null } })} /></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={g.alwaysApprove} onChange={(e) => setG({ ...g, alwaysApprove: e.target.checked })} /><span>Luôn yêu cầu duyệt mỗi lần gọi<span className="block text-xs text-slate-700">Chỉ nên thêm chặt. Bỏ tick là nới lỏng và sẽ được nêu ở bước xem trước.</span></span></label>
          {loosening && <p role="status" className="text-xs font-semibold text-amber-900">Bạn đang bỏ “luôn yêu cầu duyệt” — quyền sẽ được dùng mà không chờ bạn.</p>}
        </fieldset>
        {tried && Object.keys(errors).length > 0 && <p role="alert" className="text-sm font-medium text-red-700">Còn {Object.keys(errors).length} trường chưa hợp lệ ở trên.</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={flow.pending} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Huỷ</button>
          <button onClick={submit} disabled={flow.busy || flow.pending} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{flow.busy ? 'Đang xem trước…' : 'Xem trước và lưu'}</button>
        </div>
      </div>
    </Modal>
  )
}
