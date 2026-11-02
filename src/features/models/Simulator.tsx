import { useState } from 'react'
import { useAgentStore } from '../../store/agentStore'
import { useModelProfiles } from '../studio/queries'
import { useSimulate } from './modelMutations'

const inp = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm'

/** "Nếu task có ưu tiên Cao và 3000 token, agent X dùng model nào?" — BE giải theo luật + riêng tư + sức khoẻ, FE chỉ hiện lời giải thích. */
export function Simulator() {
  const agents = Object.values(useAgentStore((s) => s.agentsById)), models = useModelProfiles().data ?? []
  const [agentId, setAgentId] = useState(''), [priority, setPriority] = useState('NORMAL'), [tokens, setTokens] = useState(3000), [dataClass, setDataClass] = useState('INTERNAL')
  const sim = useSimulate()
  const id = agentId || agents[0]?.id || ''
  const hit = sim.data && models.find((m) => m.id === sim.data.modelId)
  return (
    <section aria-label="Mô phỏng định tuyến" className="space-y-2 rounded-card border border-slate-200 p-3">
      <h3 className="text-sm font-semibold">Mô phỏng</h3>
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label>Agent<select className={`${inp} block`} value={id} onChange={(e) => setAgentId(e.target.value)}>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Ưu tiên<select className={`${inp} block`} value={priority} onChange={(e) => setPriority(e.target.value)}><option value="HIGH">Cao</option><option value="NORMAL">Thường</option><option value="LOW">Thấp</option></select></label>
        <label>Token<input type="number" min={0} className={`${inp} block w-28`} value={tokens} onChange={(e) => setTokens(Math.max(0, Math.floor(Number(e.target.value))))} /></label>
        <label>Dữ liệu<select className={`${inp} block`} value={dataClass} onChange={(e) => setDataClass(e.target.value)}><option value="PUBLIC">Công khai</option><option value="INTERNAL">Nội bộ</option><option value="CONFIDENTIAL">Mật</option></select></label>
        <button disabled={!id || sim.isPending} onClick={() => sim.mutate({ agentId: id, priority, tokens, dataClass })} className="rounded-lg bg-brand px-3 py-1.5 text-white hover:bg-brand-dark disabled:opacity-50">Mô phỏng</button>
      </div>
      {sim.data && <p role="status" className="rounded-lg bg-slate-50 p-2 text-sm">{hit ? <>Sẽ dùng <b>{hit.label}</b> ({hit.dataClass}). </> : <b className="text-red-800">Không có model hợp lệ. </b>}{sim.data.explanation}</p>}
    </section>
  )
}
