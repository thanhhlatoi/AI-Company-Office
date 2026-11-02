import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/http'
import { Modal } from '../../components/Modal'
import { foldVi } from '../../lib/text'
import { MICRO, usdToMicro } from '../../lib/money'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import type { Budget, BudgetInput } from '../../types/cost'
import { useProjects } from '../projects/hooks'
import { PERIOD_LABEL, SCOPE_LABEL } from './budgetStyle'
import { useCreateBudget, useUpdateBudget } from './hooks'

const FIELD = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none'
const RAISE_WORD = 'TĂNG'

/**
 * Tạo / sửa ngân sách. Tăng hạn mức: BẮT BUỘC ghi lý do; tăng hơn 2 lần hạn mức cũ: phải gõ lại "TĂNG" (xác nhận lần hai).
 * (BE cũng ép lý do và trả 400 nếu thiếu, FE chỉ giúp báo sớm.)
 */
export function BudgetForm({ budget, onClose }: { budget?: Budget; onClose: () => void }) {
  const agents = Object.values(useAgentStore((s) => s.agentsById)).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const depts = Object.values(useDepartmentStore((s) => s.departmentsById)).sort((a, b) => a.order - b.order)
  const projects = useProjects({}).data ?? []
  const create = useCreateBudget(), update = useUpdateBudget()
  const [scopeType, setScopeType] = useState<Budget['scopeType']>(budget?.scopeType ?? 'AGENT')
  const [scopeId, setScopeId] = useState(budget?.scopeId ?? '')
  const [period, setPeriod] = useState<Budget['period']>(budget?.period ?? 'DAY')
  const [usd, setUsd] = useState(budget ? String(budget.limitMicro / MICRO) : '')
  const [warnPct, setWarnPct] = useState(String(budget?.warnPct ?? 80))
  const [mode, setMode] = useState<Budget['mode']>(budget?.mode ?? 'BLOCK')
  const [reason, setReason] = useState(''), [typed, setTyped] = useState('')
  const [error, setError] = useState('')

  const limit = usdToMicro(Number(usd))
  const raising = !!budget && limit > budget.limitMicro
  const big = !!budget && limit > budget.limitMicro * 2
  const pending = create.isPending || update.isPending
  const fail = (e: unknown) => setError(e instanceof ApiError && (e.body as { message?: string } | null)?.message ? String((e.body as { message: string }).message) : 'Không lưu được, thử lại')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const w = Number(warnPct)
    if (!(limit > 0)) return setError('Hạn mức phải lớn hơn 0')
    if (!(w >= 1 && w <= 99)) return setError('Ngưỡng cảnh báo từ 1 đến 99%')
    if (!budget && scopeType !== 'COMPANY' && !scopeId) return setError('Hãy chọn đối tượng áp dụng')
    if (raising && !reason.trim()) return setError('Tăng hạn mức phải ghi lý do')
    if (big && foldVi(typed.trim()) !== foldVi(RAISE_WORD)) return setError(`Tăng hơn 2 lần hạn mức cũ: gõ ${RAISE_WORD} để xác nhận`)
    setError('')
    if (budget) update.mutate({ id: budget.id, update: { limitMicro: limit, warnPct: w, mode, reason: reason.trim() || undefined } }, { onSuccess: onClose, onError: fail })
    else create.mutate({ scopeType, scopeId: scopeType === 'COMPANY' ? null : scopeId, period, limitMicro: limit, warnPct: w, mode } as BudgetInput, { onSuccess: onClose, onError: fail })
  }
  const targets = scopeType === 'AGENT' ? agents.map((a) => [a.id, a.name]) : scopeType === 'DEPARTMENT' ? depts.map((d) => [d.id, d.name]) : projects.map((p) => [p.id, p.name])
  return (
    <Modal title={budget ? `Sửa ngân sách: ${budget.scopeLabel}` : 'Ngân sách mới'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {budget ? <p className="text-sm text-slate-600">{SCOPE_LABEL[budget.scopeType]} <b>{budget.scopeLabel}</b> · kỳ {PERIOD_LABEL[budget.period]}</p> : (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block"><span className="mb-1 block text-sm font-medium">Áp dụng cho</span><select value={scopeType} onChange={(e) => { setScopeType(e.target.value as Budget['scopeType']); setScopeId('') }} className={FIELD}>{(Object.keys(SCOPE_LABEL) as Budget['scopeType'][]).map((k) => <option key={k} value={k}>{SCOPE_LABEL[k]}</option>)}</select></label>
            {scopeType !== 'COMPANY' && <label className="block"><span className="mb-1 block text-sm font-medium">Đối tượng</span><select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className={FIELD}><option value="">Chọn…</option>{targets.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>}
            <label className="block"><span className="mb-1 block text-sm font-medium">Kỳ</span><select value={period} onChange={(e) => setPeriod(e.target.value as Budget['period'])} className={FIELD}>{(Object.keys(PERIOD_LABEL) as Budget['period'][]).map((k) => <option key={k} value={k}>Theo {PERIOD_LABEL[k]}</option>)}</select></label>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm font-medium">Hạn mức (USD)</span><input inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} className={FIELD} autoFocus /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium">Cảnh báo ở (% hạn mức)</span><input inputMode="numeric" value={warnPct} onChange={(e) => setWarnPct(e.target.value)} className={FIELD} /></label>
        </div>
        <fieldset><legend className="mb-1 text-sm font-medium">Khi hết hạn mức</legend>
          <label className="mr-4 inline-flex items-center gap-1.5 text-sm"><input type="radio" name="mode" checked={mode === 'BLOCK'} onChange={() => setMode('BLOCK')} /> Chặn (việc mới chờ ngân sách)</label>
          <label className="inline-flex items-center gap-1.5 text-sm"><input type="radio" name="mode" checked={mode === 'WARN'} onChange={() => setMode('WARN')} /> Chỉ cảnh báo</label>
        </fieldset>
        {raising && <label className="block"><span className="mb-1 block text-sm font-medium">Lý do tăng hạn mức (bắt buộc)</span><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD} /></label>}
        {big && <label className="block rounded-lg bg-red-50 p-3"><span className="mb-1 block text-sm font-medium text-red-900">Tăng hơn 2 lần hạn mức cũ. Gõ <b>{RAISE_WORD}</b> để xác nhận lần hai:</span><input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={FIELD} /></label>}
        {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">Huỷ</button><button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">{pending ? 'Đang lưu…' : 'Lưu'}</button></div>
      </form>
    </Modal>
  )
}
