import { Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '../../components/Modal'
import { RiskChip } from '../../components/studio/badges'
import { download } from '../history/exportConv'
import { useTools } from '../studio/queries'
import type { AgentTemplate } from '../../types/studio'
import { toExport } from './logic'
import { PromptSections } from './PromptSections'

const TIER = { FAST: 'Nhanh', BALANCED: 'Cân bằng', POWER: 'Mạnh' } as const
const KIND = { BUILTIN: 'Dựng sẵn', MINE: 'Của tôi', IMPORTED: 'Đã nhập' } as const

/** Xem trước mẫu: prompt đọc được có chú thích từng phần, công cụ đề xuất kèm chip rủi ro, yêu cầu model. */
export function PreviewDialog({ t, agentCount, onClose, onClone, onDelete }: { t: AgentTemplate; agentCount: number; onClose: () => void; onClone: () => void; onDelete: () => void }) {
  const tools = useTools().data ?? []
  return (
    <Modal title={t.name} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">{KIND[t.kind]}</span><span className="text-xs text-slate-700">{t.group} · v{t.version} · {agentCount} agent đang dùng</span></p>
        <p>{t.description}</p>
        <section aria-label="Prompt"><h3 className="mb-1 font-semibold">Prompt</h3><PromptSections prompt={t.systemPrompt} notes={t.promptNotes} />
          {t.variables.length > 0 && <p className="mt-1 text-xs text-slate-700">Biến: {t.variables.map((v) => `{{${v.key}}}${v.required ? '*' : ''}`).join(', ')}</p>}</section>
        <section aria-label="Công cụ đề xuất"><h3 className="mb-1 font-semibold">Công cụ đề xuất</h3>
          {t.suggestedTools.length === 0 ? <p className="text-slate-700">Không đề xuất công cụ nào.</p> : <ul className="flex flex-wrap gap-2">{t.suggestedTools.map((s) => { const tool = tools.find((x) => x.id === s.toolId); return <li key={s.toolId} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1">{tool?.name ?? s.toolId}{tool && <RiskChip risk={tool.risk} />}</li> })}</ul>}
          <p className="mt-1 text-xs text-slate-700">Chỉ là đề xuất: khi tạo agent, mọi công cụ đều TẮT cho tới khi bạn tick và điền phạm vi.</p></section>
        <section aria-label="Yêu cầu model"><h3 className="mb-1 font-semibold">Yêu cầu model</h3>
          <p>{t.modelRequirement.preferLocal ? 'Ưu tiên model LOCAL.' : 'Không ưu tiên local.'}{t.modelRequirement.needsToolUse && ' Cần model hỗ trợ dùng công cụ.'}{t.modelRequirement.minTier && ` Tier tối thiểu: ${TIER[t.modelRequirement.minTier]}.`}</p></section>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
          <button onClick={() => download(`mau-${t.id}.json`, 'application/json', JSON.stringify(toExport(t), null, 2))} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"><Download size={14} aria-hidden />Xuất JSON</button>
          {t.locked ? <button onClick={onClone} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Nhân bản để sửa</button> : <button onClick={onDelete} className="rounded-lg border border-red-300 px-3 py-1.5 text-red-800 hover:bg-red-50">Xoá mẫu</button>}
          <Link to={`/templates/${t.id}/create`} onClick={onClose} className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark">Tạo agent từ mẫu</Link>
        </div>
      </div>
    </Modal>
  )
}
