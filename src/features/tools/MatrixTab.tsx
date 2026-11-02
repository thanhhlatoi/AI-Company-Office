import { ShieldAlert } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { RiskChip } from '../../components/studio/badges'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import type { Tool, EffectiveTool, EffectivePermissions, RiskLevel } from '../../types/tools'
import { RISK_ORDER, RISK_STYLE, hasRiskTriangle, riskRank } from '../studio/risk'
import { useEffectiveAll, useTools } from '../studio/queries'
import { CellEditor } from './CellEditor'

const PAGE_ROWS = 20
const sel = 'rounded-lg border border-slate-300 px-2 py-1 text-sm'

function Cell({ e, tool, agent, onOpen }: { e?: EffectiveTool; tool: Tool; agent: string; onOpen: () => void }) {
  const text = !e ? 'chưa cấp' : `${RISK_STYLE[e.risk].label}${e.needsApproval ? ', cần duyệt' : ''}${e.blockedReason ? `, đang bị chặn: ${e.blockedReason}` : ''}${e.expiresAt ? `, hết hạn ${new Date(e.expiresAt).toLocaleDateString('vi-VN')}` : ''}`
  return (
    <td className="border-l border-slate-100 p-0 text-center">
      <button onClick={onOpen} aria-label={`${agent} — ${tool.name}: ${text}`} title={e ? `${text}${e.scopeSummary ? `\n${e.scopeSummary}` : ''}` : `${tool.name}: chưa cấp (bấm để cấp)`} className="grid h-9 w-full place-items-center hover:bg-slate-100">
        {e ? (
          <span className={`relative inline-flex ${e.allowed ? '' : 'opacity-50'}`} style={e.allowed ? undefined : { outline: '1px dashed #64748b', outlineOffset: 2, borderRadius: 999 }}>
            <RiskChip risk={e.risk} compact />
            {e.needsApproval && <span aria-hidden className="absolute -right-2 -top-2 grid size-3.5 place-items-center rounded-full bg-amber-700 text-[9px] font-bold text-white">!</span>}
          </span>
        ) : <span aria-hidden className="text-slate-600">·</span>}
      </button>
    </td>
  )
}

/** Ma trận quyền: hàng = agent (nhóm theo phòng), cột = công cụ. Phân trang theo hàng; sticky cột tên. */
export function MatrixTab() {
  const tools = useTools(), eff = useEffectiveAll()
  const agents = useAgentStore((s) => s.agentsById), depts = useDepartmentStore((s) => s.departmentsById)
  const [dept, setDept] = useState(''), [risk, setRisk] = useState<RiskLevel | ''>(''), [onlyExt, setOnlyExt] = useState(false), [rows, setRows] = useState(PAGE_ROWS)
  const [open, setOpen] = useState<{ agentId: string; toolId: string } | null>(null)
  const byAgent = useMemo(() => new Map((eff.data ?? []).map((p): [string, EffectivePermissions] => [p.agentId, p])), [eff.data])
  const cols = (tools.data ?? []).filter((t) => !risk || t.risk === risk).sort((a, b) => riskRank(a.risk) - riskRank(b.risk))
  const list = useMemo(() => Object.values(agents).filter((a) => (!dept || a.departmentId === dept) && (() => {
    const p = byAgent.get(a.id)
    if (onlyExt && !p?.tools.some((t) => t.allowed && riskRank(t.risk) >= riskRank('EXTERNAL'))) return false
    return !risk || p?.tools.some((t) => t.risk === risk)
  })()).sort((a, b) => Number(a.departmentId) - Number(b.departmentId) || Number(b.isHead) - Number(a.isHead) || a.name.localeCompare(b.name)), [agents, byAgent, dept, risk, onlyExt])
  if (tools.isLoading || eff.isLoading) return <div className="h-64 animate-pulse rounded-card bg-slate-200" />
  if (tools.isError || eff.isError) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được ma trận. <button className="underline" onClick={() => { void tools.refetch(); void eff.refetch() }}>Thử lại</button></p>
  const shown = list.slice(0, rows), openTool = open && tools.data?.find((t) => t.id === open.toolId)
  return (
    <section aria-label="Ma trận quyền" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label>Phòng ban <select className={sel} value={dept} onChange={(e) => { setDept(e.target.value); setRows(PAGE_ROWS) }}><option value="">Tất cả</option>{Object.values(depts).sort((a, b) => a.order - b.order).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label>Rủi ro <select className={sel} value={risk} onChange={(e) => setRisk(e.target.value as RiskLevel | '')}><option value="">Tất cả</option>{RISK_ORDER.map((r) => <option key={r} value={r}>{RISK_STYLE[r].label}</option>)}</select></label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={onlyExt} onChange={(e) => setOnlyExt(e.target.checked)} />Chỉ agent có công cụ gửi ra ngoài (EXTERNAL trở lên)</label>
        <span className="ml-auto text-xs text-slate-700">{list.length} agent</span>
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">Chú giải: {RISK_ORDER.map((r) => <span key={r} className="inline-flex items-center gap-1"><RiskChip risk={r} compact />{RISK_STYLE[r].label}</span>)}<span><b className="rounded-full bg-amber-700 px-1 text-white">!</b> cần duyệt</span><span>vòng nét đứt = đang bị chặn / hết hạn</span></p>
      {list.length === 0 ? <p className="rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-700">Không có agent nào khớp bộ lọc.</p> : (
        <div className="max-h-[70vh] overflow-auto rounded-card border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-slate-50">
              <tr><th scope="col" className="sticky left-0 z-30 min-w-44 bg-slate-50 p-2 text-left font-semibold">Agent</th>
                {cols.map((t) => <th key={t.id} scope="col" title={t.name} className="h-28 w-10 min-w-10 border-l border-slate-100 p-0 align-bottom font-medium"><span className="block pb-1 text-xs" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto' }}>{t.name}</span></th>)}</tr>
            </thead>
            <tbody>
              {shown.map((a, i) => {
                const p = byAgent.get(a.id), head = i === 0 || shown[i - 1].departmentId !== a.departmentId
                return (
                  <Fragment key={a.id}>
                    {head && <tr><th colSpan={cols.length + 1} scope="colgroup" className="sticky left-0 bg-slate-100 px-2 py-1 text-left text-xs font-semibold text-slate-800">{depts[a.departmentId ?? '']?.name ?? 'Chưa phân phòng'}</th></tr>}
                    <tr className="border-t border-slate-100">
                      <th scope="row" className="sticky left-0 z-10 bg-white p-2 text-left font-normal"><span className="flex items-center gap-1.5">{a.name}{p && hasRiskTriangle(p) && <ShieldAlert size={14} className="text-orange-800" aria-label="Tam giác rủi ro" />}</span></th>
                      {cols.map((t) => <Cell key={t.id} e={p?.tools.find((x) => x.toolId === t.id)} tool={t} agent={a.name} onOpen={() => setOpen({ agentId: a.id, toolId: t.id })} />)}
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows < list.length && <button onClick={() => setRows(rows + PAGE_ROWS)} className="w-full rounded-lg border border-slate-300 py-2 text-sm hover:bg-slate-50">Hiện thêm {Math.min(PAGE_ROWS, list.length - rows)} agent (còn {list.length - rows})</button>}
      {open && openTool && <CellEditor key={`${open.agentId}:${open.toolId}`} agentId={open.agentId} agentName={agents[open.agentId]?.name ?? open.agentId} tool={openTool} onClose={() => setOpen(null)} />}
    </section>
  )
}
