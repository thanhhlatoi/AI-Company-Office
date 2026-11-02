import { useState } from 'react'
import { DecisionChip } from '../../components/studio/badges'
import { sampleArgs } from './grantRules'
import { useTools } from './queries'
import { useCheck } from './toolMutations'

/** "Thử quyền": hỏi BE xem một lời gọi sẽ được phép / bị từ chối / cần duyệt — KHÔNG thực thi gì. */
export function PermissionTester({ agentId }: { agentId: string }) {
  const tools = useTools().data ?? []
  const [toolId, setToolId] = useState('email_send')
  const [text, setText] = useState(JSON.stringify(sampleArgs('email_send'), null, 1))
  const [bad, setBad] = useState(false)
  const check = useCheck()
  const pick = (id: string) => { setToolId(id); setText(JSON.stringify(sampleArgs(id), null, 1)); check.reset() }
  const run = () => { try { const args = JSON.parse(text) as Record<string, unknown>; setBad(false); check.mutate({ toolId, agentId, args }) } catch { setBad(true) } }
  return (
    <section aria-label="Thử quyền" className="space-y-2 rounded-card border border-slate-200 p-3">
      <h3 className="text-sm font-semibold">Thử quyền (không thực thi)</h3>
      <select aria-label="Công cụ cần thử" value={toolId} onChange={(e) => pick(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">{tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <textarea aria-label="Tham số mẫu (JSON)" value={text} onChange={(e) => setText(e.target.value)} rows={4} spellCheck={false} className="w-full rounded-lg border border-slate-300 p-2 font-mono text-xs" />
      {bad && <p role="alert" className="text-xs font-medium text-red-700">Tham số không phải JSON hợp lệ.</p>}
      <button onClick={run} disabled={check.isPending} className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{check.isPending ? 'Đang hỏi…' : 'Thử'}</button>
      {check.data && <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm"><DecisionChip value={check.data.decision} /><span>{check.data.reason}</span></div>}
    </section>
  )
}
