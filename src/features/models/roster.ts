import type { Agent, Department } from '../../types'
import type { ModelPolicy, ModelProfile } from '../../types/models'

/** Một dòng "Hermes nhìn thấy": agent, phòng, kỹ năng, model đang dùng. Chỉ để HIỂN THỊ; việc giao thật là của BE. */
export interface RosterRow {
  id: string
  name: string
  role: string
  department: string
  isHead: boolean
  skills: string[]
  status: Agent['status']
  currentTask: Agent['currentTask']
  /** model BE đã giải; null = chưa có chính sách hoặc không có model hợp lệ */
  model: { label: string; dataClass: ModelProfile['dataClass'] } | null
  hasPolicy: boolean
  blockedBy: string | null
  /** trường model cũ của agent, dùng khi chưa có chính sách */
  legacyModel: string
}

export function buildRoster(agents: Agent[], departments: Department[], policies: ModelPolicy[], models: ModelProfile[]): RosterRow[] {
  const dep = new Map(departments.map((d) => [d.id, d]))
  const pol = new Map(policies.map((p) => [p.agentId, p]))
  const rows = agents.map((a): RosterRow => {
    const p = pol.get(a.id)
    const m = models.find((x) => x.id === p?.resolved.modelId)
    return {
      id: a.id, name: a.name, role: a.role, department: dep.get(a.departmentId ?? '')?.name ?? 'Chưa phân phòng', isHead: a.isHead,
      skills: a.skills ?? [], status: a.status, currentTask: a.currentTask,
      model: m ? { label: m.label, dataClass: m.dataClass } : null, hasPolicy: !!p, blockedBy: p && !m ? (p.resolved.blockedBy ?? 'chưa chọn model') : null, legacyModel: a.model,
    }
  })
  const order = (r: RosterRow) => dep.get(agents.find((a) => a.id === r.id)?.departmentId ?? '')?.order ?? 999
  return rows.sort((a, b) => order(a) - order(b) || Number(b.isHead) - Number(a.isHead) || a.name.localeCompare(b.name, 'vi'))
}

const norm = (s: string) => s.toLocaleLowerCase('vi')

/** Kỹ năng và số agent có nó (không phân biệt hoa thường), nhiều nhất trước. */
export function skillCounts(rows: RosterRow[]): [string, number][] {
  const m = new Map<string, { label: string; n: number }>()
  for (const r of rows) for (const s of r.skills) { const e = m.get(norm(s)); if (e) e.n++; else m.set(norm(s), { label: s, n: 1 }) }
  return [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'vi')).map((e) => [e.label, e.n])
}

/** Agent có ĐỦ mọi kỹ năng đã chọn; chưa chọn gì thì giữ nguyên. */
export const filterBySkills = (rows: RosterRow[], selected: string[]) =>
  selected.length ? rows.filter((r) => selected.every((s) => r.skills.some((x) => norm(x) === norm(s)))) : rows
