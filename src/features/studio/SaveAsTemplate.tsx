import { useState } from 'react'
import { Modal } from '../../components/Modal'
import type { Agent } from '../../types'
import { applyVariables } from '../templates/logic'
import { useSaveAsTemplate } from '../templates/mutations'
import { useLint } from './mutations'
import { useGrants, useTools } from './queries'

const inp = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
const NOT_COPIED = ['Bí mật (khoá API, mật khẩu, token)', 'Id tài khoản thư / kênh', 'Đường dẫn, mã bảng tính, tên miền và bên nhận cụ thể', 'Bộ nhớ của agent', 'Tài liệu và bộ sưu tập kho']
type Rep = { find: string; key: string; label: string }

/** "Lưu agent này thành mẫu": chọn phần tham số hoá; nêu rõ những gì KHÔNG được chép. Prompt phải qua PromptLinter (không chứa bí mật). */
export function SaveAsTemplate({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [name, setName] = useState(`${agent.name} (mẫu)`), [desc, setDesc] = useState(agent.role), [reps, setReps] = useState<Rep[]>([]), [err, setErr] = useState('')
  const save = useSaveAsTemplate(agent.id), lint = useLint()
  const tools = useTools().data ?? [], grants = useGrants(agent.id).data ?? []
  const prompt = applyVariables(agent.systemPrompt, reps)
  const upd = (i: number, p: Partial<Rep>) => setReps(reps.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const submit = () => {
    if (!name.trim()) return setErr('Mẫu cần có tên')
    setErr('')
    lint.mutate(prompt, { onSuccess: (r) => {
      const bad = r.issues.find((i) => i.severity === 'error')
      if (bad) return setErr(`Prompt có lỗi nghiêm trọng (dòng ${bad.line}): ${bad.message}`)
      save.mutate({ name: name.trim(), group: 'Mẫu của tôi', description: desc, systemPrompt: prompt, promptNotes: [], variables: reps.filter((r) => r.find.trim() && r.key).map((r) => ({ key: r.key, label: r.label || r.key, default: r.find, required: false })), suggestedTools: grants.map((g) => ({ toolId: g.toolId, scope: {} })), modelRequirement: { preferLocal: false, needsToolUse: grants.length > 0, minTier: null } }, { onSuccess: onClose })
    } })
  }
  return (
    <Modal title={`Lưu ${agent.name} thành mẫu`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Tên mẫu<input className={inp} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
        <label className="block">Mô tả<input className={inp} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} /></label>
        <fieldset className="space-y-2 rounded-card border border-slate-200 p-3"><legend className="px-1 font-semibold">Tham số hoá prompt (tuỳ chọn)</legend>
          <p className="text-xs text-slate-700">Thay một đoạn chữ cụ thể (ví dụ tên công ty) bằng biến <span className="font-mono">{'{{khoá}}'}</span> để người dùng mẫu tự điền.</p>
          {reps.map((r, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2"><label className="min-w-32 flex-1">Đoạn chữ<input className={inp} value={r.find} onChange={(e) => upd(i, { find: e.target.value })} /></label><label className="w-28">Khoá<input className={inp} value={r.key} onChange={(e) => upd(i, { key: e.target.value })} placeholder="company" /></label><label className="w-32">Nhãn<input className={inp} value={r.label} onChange={(e) => upd(i, { label: e.target.value })} /></label>
              <button type="button" aria-label="Bỏ biến" onClick={() => setReps(reps.filter((_, j) => j !== i))} className="rounded px-2 py-1.5 hover:bg-slate-100">×</button>
              {r.find && <span className="w-full text-xs text-slate-700">Có {agent.systemPrompt.split(r.find).length - 1} chỗ sẽ được thay.</span>}</div>))}
          <button type="button" onClick={() => setReps([...reps, { find: '', key: '', label: '' }])} className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50">+ Thêm biến</button></fieldset>
        <section aria-label="Những gì được chép"><h3 className="font-semibold">Được chép</h3><p>Prompt{reps.length ? ' (đã tham số hoá)' : ''}, yêu cầu model, và danh sách công cụ ĐỀ XUẤT: {grants.length ? grants.map((g) => tools.find((t) => t.id === g.toolId)?.name ?? g.toolId).join(', ') : 'không có'} (phạm vi bị để trống).</p></section>
        <section aria-label="Những gì KHÔNG được chép"><h3 className="font-semibold text-red-900">KHÔNG được chép</h3><ul className="list-disc pl-5">{NOT_COPIED.map((x) => <li key={x}>{x}</li>)}</ul></section>
        {err && <p role="alert" className="rounded-lg bg-red-50 p-2 font-medium text-red-900">{err}</p>}
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-slate-100">Huỷ</button><button disabled={save.isPending || lint.isPending} onClick={submit} className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-50">{lint.isPending || save.isPending ? 'Đang lưu…' : 'Lưu thành mẫu'}</button></div>
      </div>
    </Modal>
  )
}
