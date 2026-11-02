import assert from 'node:assert/strict'
import { test } from 'node:test'
import { policyWarnings } from './modelRules.ts'

const m = (id: string, dataClass: 'LOCAL' | 'CLOUD', toolUse: boolean, status: 'UP' | 'DOWN' = 'UP', deviceId?: string) =>
  ({ id, label: id, provider: dataClass === 'CLOUD' ? 'anthropic' : 'ollama', modelId: id, dataClass, tier: 'FAST', capabilities: { toolUse, json: true, vision: false }, health: { status, consecutiveErrors: 0 }, deviceId, contextTokens: 1, maxConcurrent: 1, inUse: 0, inputPerMTokMicro: 0, outputPerMTokMicro: 0 }) as never
const models = [m('cloud', 'CLOUD', true), m('local', 'LOCAL', true, 'UP', 'ai-pc'), m('notool', 'LOCAL', false)]
const base = { primaryId: 'cloud', fallbackIds: [] as string[], escalationId: null, routing: 'FIXED' as const, privacy: 'ANY' as const }

test('không cảnh báo khi hợp lệ', () => assert.deepEqual(policyWarnings(base, models, true), []))
test('có công cụ mà model chính không hỗ trợ -> lỗi', () => {
  const w = policyWarnings({ ...base, primaryId: 'notool' }, models, true)
  assert.equal(w[0].level, 'error')
  assert.deepEqual(policyWarnings({ ...base, primaryId: 'notool' }, models, false), []) // không có công cụ thì không sao
})
test('Chỉ local mà không có model local -> lỗi', () => assert.equal(policyWarnings({ ...base, privacy: 'LOCAL_ONLY' }, models, false)[0].level, 'error'))
test('Chỉ local, máy local OFFLINE -> lỗi; cloud trong chuỗi -> cảnh báo bị bỏ qua', () => {
  const w = policyWarnings({ ...base, primaryId: 'local', fallbackIds: ['cloud'], privacy: 'LOCAL_ONLY' }, models, false, (id) => id === 'ai-pc')
  assert.deepEqual(w.map((x) => x.level), ['error', 'warning'])
  assert.deepEqual(policyWarnings({ ...base, primaryId: 'local', privacy: 'LOCAL_ONLY' }, models, false), [])
})
