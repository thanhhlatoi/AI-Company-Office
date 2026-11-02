import { Globe, Lock, LockKeyhole, Send, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RiskChip } from '../../components/studio/badges'
import type { Agent } from '../../types'
import type { EffectivePermissions, Tool } from '../../types/tools'
import { ChangeConfirm } from './ChangeConfirm'
import { changeOf } from './grantRules'
import { GrantDialog } from './GrantDialog'
import { PermissionTester } from './PermissionTester'
import { TRIANGLE_TEXT, hasRiskTriangle } from './risk'
import { useEffective, useGrants, useTools } from './queries'
import { useChangeFlow } from './useChangeFlow'

/** Tab "Công cụ và quyền": bật/tắt từng công cụ theo nhóm, chỉnh phạm vi, thử quyền, cảnh báo tam giác rủi ro. */
export function ToolsTab({ agent, onPreview }: { agent: Agent; onPreview: (p?: EffectivePermissions) => void }) {
  const tools = useTools(), grants = useGrants(agent.id), eff = useEffective(agent.id)
  const [editing, setEditing] = useState<Tool | null>(null)
  const flow = useChangeFlow(agent.id, onPreview, () => setEditing(null))
  if (tools.isLoading || grants.isLoading) return <div className="h-48 animate-pulse rounded-card bg-slate-200" />
  if (tools.isError || grants.isError) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được công cụ. <button className="underline" onClick={() => { void tools.refetch(); void grants.refetch() }}>Thử lại</button></p>
  const list = tools.data ?? [], mine = grants.data ?? []
  const groups = [...new Set(list.map((t) => t.group))]
  const closeAll = () => { setEditing(null); flow.cancel() }
  const blocked = (t: Tool) => (!t.enabled ? 'Đang bị tắt khẩn cấp toàn hệ thống' : t.requiresAdminFlag && !t.adminFlagOn ? 'Khoá: cần bật cờ xác nhận ở trang quản trị' : null)
  const effOf = (id: string) => eff.data?.tools.find((x) => x.toolId === id)
  const toggle = (t: Tool) => (mine.some((g) => g.toolId === t.id) ? flow.start(changeOf([], [t.id])) : setEditing(t))
  return (
    <div className="space-y-4">
      {eff.data && hasRiskTriangle(eff.data) && <p role="alert" className="flex gap-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-950"><ShieldAlert size={18} className="shrink-0" aria-hidden /><span><b>Tam giác rủi ro.</b> {TRIANGLE_TEXT}</span></p>}
      {groups.map((group) => (
        <section key={group} aria-label={`Nhóm ${group}`} className="space-y-2">
          <h3 className="text-sm font-semibold">{group}</h3>
          <ul className="space-y-2">
            {list.filter((t) => t.group === group).map((t) => {
              const g = mine.find((x) => x.toolId === t.id), why = blocked(t), on = !!g, e = effOf(t.id)
              return (
                <li key={t.id} className={`flex items-start gap-3 rounded-card border p-3 ${why && !on ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}>
                  <button role="switch" aria-checked={on} aria-label={`${on ? 'Tắt' : 'Bật'} ${t.name}`} aria-describedby={`d-${t.id}`} disabled={!!why && !on} onClick={() => toggle(t)}
                    className={`mt-0.5 h-6 w-11 shrink-0 rounded-full p-0.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'bg-green-700' : 'bg-slate-400'}`}><span className={`block size-5 rounded-full bg-white transition ${on ? 'translate-x-5' : ''}`} /></button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2"><b className="text-sm">{t.name}</b><RiskChip risk={t.risk} />
                      {t.readsExternal && <span className="inline-flex items-center gap-0.5 text-xs text-slate-700" title="Đọc nội dung từ bên ngoài: task có thể bị nhiễm"><Globe size={12} aria-hidden />Đọc nội dung ngoài</span>}
                      {t.readsPrivate && <span className="inline-flex items-center gap-0.5 text-xs text-slate-700"><Lock size={12} aria-hidden />Dữ liệu riêng</span>}
                      {t.sendsOut && <span className="inline-flex items-center gap-0.5 text-xs text-slate-700"><Send size={12} aria-hidden />Gửi ra ngoài</span>}
                    </div>
                    <p id={`d-${t.id}`} className="text-xs text-slate-700">{t.description}</p>
                    {why && <p className="flex items-center gap-1 text-xs font-semibold text-red-800"><LockKeyhole size={12} aria-hidden />{why}{t.requiresAdminFlag && !t.adminFlagOn && <> — <Link to="/tools" className="underline">mở trang Công cụ</Link></>}</p>}
                    {on && e && <p className="break-words text-xs text-slate-700">{e.scopeSummary || 'Không có phạm vi'}{e.needsApproval && ' · mỗi lần chờ duyệt'}{!e.allowed && ` · đang bị chặn: ${e.blockedReason}`}</p>}
                  </div>
                  {on && <button onClick={() => setEditing(t)} className="shrink-0 rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">Chỉnh phạm vi</button>}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <PermissionTester agentId={agent.id} />
      {editing && <GrantDialog key={editing.id} tool={editing} existing={mine.find((x) => x.toolId === editing.id)} flow={flow} onClose={closeAll} />}
      <ChangeConfirm flow={flow} onClose={() => {}} />
    </div>
  )
}
