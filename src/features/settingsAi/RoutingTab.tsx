import { Plus, Trash2 } from 'lucide-react'
import { FIXED_ALIASES } from '../../types/settingsAi'
import { aliasErrors, type AliasRow } from './draft'
import { describeError } from './errors'
import { INPUT } from './fieldProps'
import { useAiModels } from './hooks'
import type { DraftForm } from './useDraft'

const ROLE: Record<string, string> = { 'local.small': 'Agent nhỏ, rẻ', 'local.strong': 'Agent mạnh', planner: 'Planner (LlmPlanner, lập kế hoạch)' }

export function RoutingTab({ f }: { f: DraftForm }) {
  const { draft: d, set, readOnly } = f
  const rows = d['llm.modelAliases']
  const errs = aliasErrors(rows)
  const source = d['llm.viaOmniroute'] ? 'omniroute' : 'ollama'
  const models = useAiModels(source)
  const ids = models.data?.models.map((m) => m.id)
  const err = models.isError ? describeError(models.error) : null
  const setRows = (next: AliasRow[]) => set('llm.modelAliases', next)
  const edit = (i: number, patch: Partial<AliasRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-card border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Độ khó → combo/model</h2>
        <p className="text-sm text-slate-700">Agent có <code>modelProfile = local.small</code> sẽ gọi combo ở dòng <code>local.small</code>; tương tự cho các dòng còn lại. Dòng cố định để trống nghĩa là không đặt.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => void models.refetch()} disabled={models.isFetching} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">{models.isFetching ? 'Đang tải…' : `Tải danh sách ${source === 'omniroute' ? 'combo/model' : 'model Ollama'}`}</button>
          {ids && <span className="text-sm text-slate-700">Đã tải {ids.length} mục</span>}
        </div>
        {err && <p role="alert" className="text-sm text-red-800">⚠ {err.message}{err.requestId ? ` (mã tra log: ${err.requestId})` : ''}</p>}
        <datalist id="routing-models">{models.data?.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</datalist>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left"><tr><th scope="col" className="p-1 font-semibold">Alias</th><th scope="col" className="p-1 font-semibold">Combo/model</th><th scope="col" className="p-1"><span className="sr-only">Xoá</span></th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const fixed = i < FIXED_ALIASES.length
                const unknown = ids && r.value.trim() !== '' && !ids.includes(r.value.trim())
                return (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="p-1">
                      {fixed ? <><span className="font-mono font-medium">{r.key}</span><span className="block text-xs text-slate-600">{ROLE[r.key]}</span></>
                        : <input aria-label={`Tên alias, dòng ${i + 1}`} value={r.key} disabled={readOnly} onChange={(e) => edit(i, { key: e.target.value })} aria-invalid={errs[i] && !r.key.trim() ? true : undefined} className={`${INPUT} font-mono`} spellCheck={false} />}
                    </td>
                    <td className="p-1">
                      <input aria-label={`Combo/model cho ${r.key || `dòng ${i + 1}`}`} list="routing-models" value={r.value} disabled={readOnly} onChange={(e) => edit(i, { value: e.target.value })} aria-invalid={errs[i] ? true : undefined} className={INPUT} spellCheck={false} />
                      {errs[i] && <p role="alert" className="text-xs font-medium text-red-800">⚠ {errs[i]}</p>}
                      {unknown && <p className="text-xs text-amber-900">⚠ “{r.value.trim()}” không có trong danh sách đã tải; kiểm tra lại tên.</p>}
                    </td>
                    <td className="p-1 text-right">
                      {!fixed && !readOnly && <button onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Xoá dòng ${r.key || i + 1}`} className="rounded p-2 text-red-800 hover:bg-red-50"><Trash2 size={14} aria-hidden /></button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!readOnly && <button onClick={() => setRows([...rows, { key: '', value: '' }])} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"><Plus size={14} aria-hidden />Thêm dòng tuỳ chỉnh</button>}
      </section>
    </div>
  )
}
