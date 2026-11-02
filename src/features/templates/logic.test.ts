import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyVariables, parseImport, recommendModels, toExport } from './logic.ts'

const m = (id: string, dataClass: 'LOCAL' | 'CLOUD', toolUse: boolean, status: 'UP' | 'DOWN' = 'UP', tier: 'FAST' | 'BALANCED' | 'POWER' = 'BALANCED') =>
  ({ id, label: id, provider: 'x', modelId: id, dataClass, tier, capabilities: { toolUse, json: true, vision: false }, health: { status, consecutiveErrors: 0 }, contextTokens: 1, maxConcurrent: 1, inUse: 0, inputPerMTokMicro: 0, outputPerMTokMicro: 0 }) as never

test('nhập: JSON hỏng, thiếu prompt, quá lớn, hợp lệ (trường lạ bị bỏ, nhóm đặt là "Đã nhập")', () => {
  assert.equal(parseImport('{không json').ok, false)
  assert.match((parseImport('{"name":"A","systemPrompt":"ngắn"}') as { error: string }).error, /systemPrompt/)
  assert.equal(parseImport('x'.repeat(300 * 1024)).ok, false)
  const ok = parseImport(JSON.stringify({ name: ' Mẫu ', group: 'Điều hành', systemPrompt: 'Bạn là trợ lý của {{company}}.', evil: '<script>', variables: [{ key: 'company', label: 'Công ty' }], suggestedTools: [{ toolId: 'email_send' }] }))
  assert.ok(ok.ok)
  if (ok.ok) { assert.equal(ok.template.name, 'Mẫu'); assert.equal(ok.template.group, 'Đã nhập'); assert.equal('evil' in ok.template, false); assert.deepEqual(ok.template.suggestedTools[0].scope, {}) }
})
test('xuất rồi nhập lại giữ nguyên nội dung', () => {
  const t = { id: '1', kind: 'MINE', locked: false, createdAt: 'x', version: 2, name: 'N', group: 'G', description: 'd', systemPrompt: 'Bạn là {{a}} 1234567', promptNotes: [], variables: [{ key: 'a', label: 'A', default: 'x', required: true }], suggestedTools: [{ toolId: 't', scope: { k: 1 } }], modelRequirement: { preferLocal: true, needsToolUse: false, minTier: null } } as never
  const out = toExport(t); assert.equal('id' in out, false)
  const back = parseImport(JSON.stringify(out)); assert.ok(back.ok); if (back.ok) { assert.equal(back.template.systemPrompt, out.systemPrompt); assert.deepEqual(back.template.suggestedTools, out.suggestedTools) }
})
test('tham số hoá prompt', () => {
  assert.equal(applyVariables('Công ty ACME bán cho ACME', [{ find: 'ACME', key: 'company' }]), 'Công ty {{company}} bán cho {{company}}')
  assert.equal(applyVariables('abc', [{ find: '', key: 'k' }, { find: 'a', key: '1sai' }]), 'abc')
})
test('gợi ý model: ưu tiên local, loại model không dùng công cụ / đang DOWN', () => {
  const r = recommendModels({ preferLocal: true, needsToolUse: true, minTier: null }, [m('cloud', 'CLOUD', true), m('local-notool', 'LOCAL', false), m('local', 'LOCAL', true), m('local-down', 'LOCAL', true, 'DOWN')])
  assert.deepEqual(r.map((x) => x.model.id).slice(0, 2), ['local', 'cloud'])
  assert.equal(r.find((x) => x.model.id === 'local-notool')?.fit, false); assert.equal(r.find((x) => x.model.id === 'local-down')?.fit, false)
  assert.equal(recommendModels({ preferLocal: false, needsToolUse: false, minTier: 'POWER' }, [m('b', 'CLOUD', true)])[0].fit, false)
})
