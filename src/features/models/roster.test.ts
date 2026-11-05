import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildRoster, filterBySkills, skillCounts } from './roster.ts'
import type { Agent, Department } from '../../types/index.ts'
import type { ModelPolicy, ModelProfile } from '../../types/models.ts'

const ag = (id: string, name: string, departmentId: string, skills: string[], extra: Partial<Agent> = {}) => ({ id, name, role: 'r', model: 'old', departmentId, isHead: false, skills, status: 'IDLE', currentTask: null, ...extra }) as Agent
const agents = [ag('1', 'Biên kịch', 'd2', ['viết kịch bản', 'Tiếng Việt']), ag('2', 'Hermes', 'd1', ['điều phối'], { isHead: true }), ag('3', 'Dịch', 'd2', ['tiếng việt', 'dịch EN']), ag('4', 'Lạc', '', [])]
const deps = [{ id: 'd1', name: 'Điều hành', order: 0 }, { id: 'd2', name: 'Studio', order: 1 }] as Department[]
const models = [{ id: 'm1', label: 'Qwen local', dataClass: 'LOCAL' }] as ModelProfile[]
const policies = [
  { agentId: '1', resolved: { modelId: 'm1' } }, { agentId: '2', resolved: { modelId: null, blockedBy: 'privacy LOCAL_ONLY' } },
] as ModelPolicy[]

test('buildRoster ghép phòng + model đã giải, sắp theo phòng', () => {
  const r = buildRoster(agents, deps, policies, models)
  assert.deepEqual(r.map((x) => x.name), ['Hermes', 'Biên kịch', 'Dịch', 'Lạc'])
  assert.deepEqual(r[1].model, { label: 'Qwen local', dataClass: 'LOCAL' })
  assert.equal(r[0].model, null)
  assert.equal(r[0].blockedBy, 'privacy LOCAL_ONLY')
  assert.equal(r[2].hasPolicy, false) // chưa có chính sách: không báo "bị chặn"
  assert.equal(r[2].blockedBy, null)
  assert.equal(r[3].department, 'Chưa phân phòng')
})

test('skillCounts gộp không phân biệt hoa thường', () => {
  const r = buildRoster(agents, deps, policies, models)
  assert.deepEqual(skillCounts(r)[0], ['Tiếng Việt', 2])
  assert.equal(skillCounts(r).length, 4)
})

test('filterBySkills: cần ĐỦ mọi kỹ năng, không phân biệt hoa thường', () => {
  const r = buildRoster(agents, deps, policies, models)
  assert.equal(filterBySkills(r, []).length, 4)
  assert.deepEqual(filterBySkills(r, ['tiếng việt']).map((x) => x.name), ['Biên kịch', 'Dịch'])
  assert.deepEqual(filterBySkills(r, ['Tiếng Việt', 'dịch EN']).map((x) => x.name), ['Dịch'])
  assert.deepEqual(filterBySkills(r, ['không có']), [])
})
