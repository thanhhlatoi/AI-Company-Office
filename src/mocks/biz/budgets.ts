import { ApiError } from '../../api/http'
import { BudgetInputSchema, ModelPriceInputSchema, type Budget } from '../../types/cost'
import { mockDb, newId } from '../db'
import { publishEvent, touchTask } from '../work'
import { agentName, budgetView, changes, isBlocked, scopePred } from './budgetView'
import { PRICES, bizTasks, budgetPred, budgets, calls, costOf, projects } from './seed'

const iso = () => new Date().toISOString()
const bad = (message: string): never => { throw new ApiError(400, `Mock 400: ${message}`, { message }) }

/** Ngân sách rộng ra thì các task WAITING_BUDGET của agent không còn bị chặn được chạy lại. */
function releaseWaiting() {
  for (const t of bizTasks) if (t.status === 'WAITING_BUDGET' && !isBlocked(t.agentId, t.projectId)) touchTask(t, { status: 'QUEUED' })
}

/** POST/PUT /budgets, POST /model-prices. undefined = không phải route của nhóm này. */
export function budgetRequest(method: string, path: string, body: unknown): unknown {
  const emit = (b: Budget) => { const v = budgetView(b); publishEvent({ type: 'budget.updated', budget: v }); return v }
  if (path === '/budgets' && method === 'POST') {
    const input = BudgetInputSchema.parse(body)
    if (input.limitMicro <= 0) bad('hạn mức phải lớn hơn 0')
    const label = input.scopeType === 'COMPANY' ? 'Cả công ty' : input.scopeType === 'AGENT' ? agentName(String(input.scopeId)) : input.scopeType === 'PROJECT' ? projects.find((p) => p.id === input.scopeId)?.name : mockDb.departments.find((d) => d.id === input.scopeId)?.name
    const b: Budget = { ...input, id: `b${budgets.length + 1}`, scopeId: input.scopeId ?? null, scopeLabel: label ?? String(input.scopeId), usedMicro: 0, reservedMicro: 0, waitingTasks: 0, state: 'OK' }
    budgets.push(b)
    budgetPred.set(b.id, scopePred(b))
    return emit(b)
  }
  const m = path.match(/^\/budgets\/([^/]+)$/)
  if (m && method === 'PUT') {
    const b = budgets.find((x) => x.id === m[1])
    if (!b) throw new ApiError(404, 'Mock 404: không có ngân sách')
    const { limitMicro, warnPct, mode, reason } = body as { limitMicro: number; warnPct: number; mode: Budget['mode']; reason?: string }
    if (!(limitMicro > 0)) bad('hạn mức phải lớn hơn 0')
    if (limitMicro > b.limitMicro && !reason?.trim()) bad('cần ghi lý do khi tăng hạn mức') // BE ép: FE cũng ép nhưng không tin FE
    if (limitMicro !== b.limitMicro) changes.unshift({ id: newId(), budgetId: b.id, at: iso(), fromMicro: b.limitMicro, toMicro: limitMicro, reason: reason?.trim() || 'Giảm hạn mức' })
    Object.assign(b, { limitMicro, warnPct, mode })
    const v = emit(b)
    releaseWaiting()
    return v
  }
  if (path === '/model-prices' && method === 'POST') {
    const input = ModelPriceInputSchema.parse(body)
    const p = { ...input, id: newId() }
    PRICES.push(p)
    for (const c of calls) if (c.costMicro === null && c.model === p.model && c.at >= Date.parse(p.effectiveFrom)) c.costMicro = costOf(c.model, c.inTok, c.outTok, c.at) // tính lại cuộc gọi chưa có giá
    publishEvent({ type: 'stats.invalidated' })
    for (const b of budgets) publishEvent({ type: 'budget.updated', budget: budgetView(b) })
    return p
  }
  return undefined
}
