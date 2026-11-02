import { LockKeyhole } from 'lucide-react'
import { RiskChip } from '../../../components/studio/badges'
import type { AgentTemplate } from '../../../types/studio'
import type { Secret, Tool } from '../../../types/tools'
import { isHighRisk } from '../../studio/risk'
import { SchemaForm } from '../../studio/SchemaForm'
import { validateScope } from '../../studio/schemaForm'
import type { Draft } from '../wizardLogic'

/** Bước 3: công cụ đề xuất ĐỀU TẮT sẵn. Bạn tick từng cái và điền phạm vi (cùng biểu mẫu với Studio). */
export function Step3({ t, d, set, tools, secrets, tried }: { t: AgentTemplate; d: Draft; set: (p: Partial<Draft>) => void; tools: Tool[]; secrets: Secret[]; tried: boolean }) {
  const upd = (id: string, p: Partial<Draft['picks'][string]>) => set({ picks: { ...d.picks, [id]: { ...d.picks[id], ...p } } })
  if (!t.suggestedTools.length) return <p className="rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-700">Mẫu này không đề xuất công cụ nào: agent sẽ chỉ trả lời bằng chữ. Bạn có thể cấp công cụ sau ở trang Cấu hình.</p>
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-sky-50 p-2 text-sm text-sky-950">Mọi công cụ bên dưới đang <b>TẮT</b>. Chỉ những công cụ bạn tick mới được cấp cho agent.</p>
      <ul className="space-y-2">
        {t.suggestedTools.map((s) => {
          const tool = tools.find((x) => x.id === s.toolId), p = d.picks[s.toolId]
          if (!tool || !p) return <li key={s.toolId} className="rounded-lg border border-slate-200 p-2 text-sm text-slate-700">Công cụ “{s.toolId}” không có trong hệ thống.</li>
          const why = !tool.enabled ? 'Đang bị tắt khẩn cấp' : tool.requiresAdminFlag && !tool.adminFlagOn ? 'Khoá: cần bật cờ xác nhận ở trang Công cụ' : null
          return (
            <li key={tool.id} className={`rounded-card border p-3 ${p.on ? 'border-brand bg-white' : 'border-slate-200 bg-slate-50'}`}>
              <label className="flex flex-wrap items-center gap-2"><input type="checkbox" checked={p.on} disabled={!!why} onChange={(e) => upd(tool.id, { on: e.target.checked })} aria-describedby={`why-${tool.id}`} /><b>{tool.name}</b><RiskChip risk={tool.risk} />{isHighRisk(tool.risk) && <span className="text-xs font-semibold text-red-900">mỗi lần gọi đều chờ duyệt</span>}</label>
              <p id={`why-${tool.id}`} className="ml-6 text-xs text-slate-700">{tool.description}</p>
              {why && <p className="ml-6 mt-1 flex items-center gap-1 text-xs font-semibold text-red-800"><LockKeyhole size={12} aria-hidden />{why}</p>}
              {p.on && (
                <div className="ml-6 mt-3 space-y-3 border-t border-slate-200 pt-3">
                  <SchemaForm schema={tool.scopeSchema} value={p.scope} onChange={(scope) => upd(tool.id, { scope })} errors={tried ? validateScope(tool.scopeSchema, p.scope) : {}} secrets={secrets} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.alwaysApprove} onChange={(e) => upd(tool.id, { alwaysApprove: e.target.checked })} />Luôn yêu cầu duyệt mỗi lần gọi</label>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
