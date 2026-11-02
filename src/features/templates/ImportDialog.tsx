import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { RiskChip } from '../../components/studio/badges'
import type { AgentTemplateInput, LintIssue } from '../../types/studio'
import { useLint } from '../studio/mutations'
import { useTools } from '../studio/queries'
import { MAX_IMPORT_BYTES, parseImport } from './logic'
import { PromptSections } from './PromptSections'
import { useTemplateActions } from './mutations'

/** Nhập mẫu từ JSON: xem trước + cảnh báo của PromptLinter; mọi quyền chỉ ở dạng ĐỀ XUẤT (tạo agent vẫn phải tick từng cái). */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const [t, setT] = useState<AgentTemplateInput | null>(null), [err, setErr] = useState(''), [issues, setIssues] = useState<LintIssue[]>([])
  const lint = useLint(), act = useTemplateActions(), tools = useTools().data ?? []
  const pick = async (f: File | undefined) => {
    setT(null); setErr(''); setIssues([])
    if (!f) return
    if (f.size > MAX_IMPORT_BYTES) return setErr(`Tệp quá lớn (tối đa ${MAX_IMPORT_BYTES / 1024} KB)`)
    const r = parseImport(await f.text())
    if (!r.ok) return setErr(r.error)
    setT(r.template); lint.mutate(r.template.systemPrompt, { onSuccess: (x) => setIssues(x.issues) })
  }
  const blocked = issues.some((i) => i.severity === 'error')
  return (
    <Modal title="Nhập mẫu từ JSON" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Tệp mẫu (.json)<input type="file" accept="application/json,.json" aria-label="Chọn tệp mẫu" onChange={(e) => void pick(e.target.files?.[0])} className="mt-1 block w-full" /></label>
        {err && <p role="alert" className="rounded-lg bg-red-50 p-2 font-medium text-red-900">{err}</p>}
        {t && (
          <>
            <p className="rounded-lg bg-amber-50 p-2 text-amber-950">Mẫu này <b>không đến từ hệ thống của bạn</b>: hãy đọc kỹ prompt. Nó sẽ được lưu vào nhóm “Đã nhập” và mọi công cụ chỉ ở dạng đề xuất.</p>
            <h3 className="font-semibold">{t.name}</h3><p>{t.description}</p>
            <PromptSections prompt={t.systemPrompt} notes={t.promptNotes} />
            {t.suggestedTools.length > 0 && <p className="flex flex-wrap items-center gap-2"><b>Đề xuất công cụ:</b>{t.suggestedTools.map((s) => { const x = tools.find((y) => y.id === s.toolId); return <span key={s.toolId} className="flex items-center gap-1">{x?.name ?? `${s.toolId} (không có trong hệ thống)`}{x && <RiskChip risk={x.risk} />}</span> })}</p>}
            <div aria-live="polite">{lint.isPending && <p>Đang kiểm tra prompt…</p>}{!lint.isPending && issues.length === 0 && <p className="text-green-800">PromptLinter: không thấy vấn đề.</p>}
              {issues.length > 0 && <ul aria-label="Cảnh báo PromptLinter" className="space-y-1">{issues.map((i, k) => <li key={k} className={`rounded p-1.5 ${i.severity === 'error' ? 'bg-red-50 text-red-950' : 'bg-amber-50 text-amber-950'}`}><b>{i.severity === 'error' ? 'Lỗi' : 'Lưu ý'}</b> · dòng {i.line}: {i.message}</li>)}</ul>}</div>
          </>
        )}
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-slate-100">Huỷ</button>
          <button disabled={!t || lint.isPending || blocked || act.import.isPending} title={blocked ? 'Prompt có lỗi nghiêm trọng, không nhập được' : undefined} onClick={() => t && act.import.mutate(t, { onSuccess: onClose })} className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-50">Nhập mẫu</button></div>
      </div>
    </Modal>
  )
}
