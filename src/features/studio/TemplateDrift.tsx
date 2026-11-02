import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { TemplatePart } from '../../api/studio'
import { Modal } from '../../components/Modal'
import type { Agent } from '../../types'
import { DiffView } from './DiffView'
import { useTemplateSync } from './mutations'
import { useGrants, useModelPolicy, useModelProfiles, useStudio, useTemplates } from './queries'
import { renderTemplate } from './template'

/** Dải thông báo "Mẫu X có bản mới" + hộp thoại khác biệt theo từng phần (prompt / công cụ / model) cho chọn áp dụng. */
export function TemplateDrift({ agent }: { agent: Agent }) {
  const cfg = useStudio(agent.id).data
  const tpl = useTemplates().data?.find((t) => t.id === cfg?.templateId)
  const [open, setOpen] = useState(false)
  if (!cfg || !tpl || !cfg.templateVersion || tpl.version <= cfg.templateVersion) return null
  return (
    <>
      <div role="status" className="flex flex-wrap items-center gap-2 rounded-card border border-sky-300 bg-sky-50 p-3 text-sm text-sky-950">
        <Sparkles size={16} aria-hidden /><span className="flex-1">Mẫu <b>{tpl.name}</b> có bản mới (v{tpl.version}); agent này đang theo v{cfg.templateVersion}.</span>
        <button onClick={() => setOpen(true)} className="rounded-lg border border-sky-700 px-3 py-1 font-medium hover:bg-sky-100">Xem khác biệt</button>
      </div>
      {open && <DriftDialog agent={agent} templateId={tpl.id} onClose={() => setOpen(false)} />}
    </>
  )
}

function DriftDialog({ agent, templateId, onClose }: { agent: Agent; templateId: string; onClose: () => void }) {
  const tpl = useTemplates().data!.find((t) => t.id === templateId)!
  const grants = useGrants(agent.id).data ?? []
  const models = useModelProfiles().data ?? []
  const policy = useModelPolicy(agent.id).data
  const [parts, setParts] = useState<TemplatePart[]>(['prompt'])
  const sync = useTemplateSync(agent.id)
  const have = new Set(grants.map((g) => g.toolId)), want = new Set(tpl.suggestedTools.map((t) => t.toolId))
  const added = [...want].filter((t) => !have.has(t)), dropped = [...have].filter((t) => !want.has(t))
  const primary = models.find((m) => m.id === policy?.primaryId)
  const modelDiffers = tpl.modelRequirement.preferLocal && primary?.dataClass !== 'LOCAL'
  const toggle = (p: TemplatePart) => setParts((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))
  const done = (list: TemplatePart[]) => sync.mutate(list, { onSuccess: onClose })
  return (
    <Modal title={`Mẫu ${tpl.name} v${tpl.version}: khác biệt`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <section aria-label="Prompt" className="space-y-1">
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={parts.includes('prompt')} onChange={() => toggle('prompt')} /> Áp dụng prompt của mẫu mới</label>
          <p className="text-xs text-slate-700">Prompt hiện tại → prompt của mẫu. Áp dụng sẽ tạo một phiên bản mới, bản cũ vẫn khôi phục được.</p>
          <DiffView oldText={agent.systemPrompt} newText={renderTemplate(tpl)} label="Khác biệt prompt" />
        </section>
        <section aria-label="Công cụ" className="space-y-1">
          <h4 className="font-semibold">Công cụ (chỉ để tham khảo)</h4>
          {!added.length && !dropped.length ? <p className="text-slate-700">Không khác biệt.</p> : (
            <ul className="list-disc pl-5">
              {added.map((t) => <li key={t}>Mẫu đề xuất thêm <b>{t}</b></li>)}
              {dropped.map((t) => <li key={t}>Agent đang có <b>{t}</b> mà mẫu không đề xuất</li>)}
            </ul>
          )}
          <p className="text-xs text-slate-700">Mẫu không bao giờ tự cấp hay thu hồi quyền. Chỉnh quyền ở tab <Link className="underline" to={`/agents/${agent.id}/studio?tab=tools`} onClick={onClose}>Công cụ và quyền</Link>.</p>
        </section>
        <section aria-label="Model" className="space-y-1">
          <label className={`flex items-center gap-2 font-semibold ${modelDiffers ? '' : 'opacity-60'}`}><input type="checkbox" disabled={!modelDiffers} checked={parts.includes('model') && modelDiffers} onChange={() => toggle('model')} /> Đổi sang model theo yêu cầu của mẫu</label>
          <p className="text-slate-700">{tpl.modelRequirement.preferLocal ? 'Mẫu ưu tiên model LOCAL.' : 'Mẫu không ưu tiên local.'} Agent đang dùng <b>{primary?.label ?? policy?.primaryId}</b> ({primary?.dataClass ?? '?'}).{!modelDiffers && ' Đã phù hợp.'}</p>
        </section>
        <div className="flex flex-wrap justify-end gap-2">
          <button disabled={sync.isPending} onClick={() => done([])} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Bỏ qua bản này</button>
          <button disabled={sync.isPending || !parts.length} onClick={() => done(parts.filter((p) => p !== 'model' || modelDiffers))} className="rounded-lg bg-brand px-3 py-1.5 text-white hover:bg-brand-dark disabled:opacity-50">{sync.isPending ? 'Đang áp dụng…' : 'Áp dụng phần đã chọn'}</button>
        </div>
      </div>
    </Modal>
  )
}
