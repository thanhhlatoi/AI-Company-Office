import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aliasErrors, aliasesToRecord, changedKeys, confirmNotes, draftFrom, toPatch, validateDraft, type Draft } from './draft.ts'
import { checkBaseUrl, isPrivateHost, safeHttpUrl } from './validate.ts'
import type { SettingsAi } from '../../types/settingsAi.ts'

const server = {
  llm: { provider: 'local', reasoningEffort: 'none', timeoutSec: 300, maxOutputTokens: 2048, viaOmniroute: true, modelAliases: { 'local.small': 'combo-a', planner: 'combo-b', extra: 'combo-c' } },
  ollama: { baseUrl: 'http://192.168.1.184:11434/v1', defaultModel: 'qwen3.6-64k:latest' },
  omniroute: { baseUrl: 'http://localhost:20128/v1' },
  hermes: { enabled: true, planner: 'hermes', baseUrl: 'http://localhost:8642' },
} as SettingsAi
const base = draftFrom(server)

test('checkBaseUrl: userinfo, giao thức lạ, rỗng bị chặn', () => {
  assert.ok(checkBaseUrl('http://user:pw@192.168.1.1:11434').error)
  assert.ok(checkBaseUrl('ftp://192.168.1.1').error)
  assert.ok(checkBaseUrl('file:///etc/passwd').error)
  assert.ok(checkBaseUrl('   ').error)
  assert.ok(checkBaseUrl('không phải url').error)
  assert.equal(checkBaseUrl('http://192.168.1.184:11434/v1').error, undefined)
})

test('checkBaseUrl: cảnh báo ngoài LAN và thiếu /v1, không chặn', () => {
  const pub = checkBaseUrl('https://api.example.com/v1')
  assert.equal(pub.error, undefined)
  assert.match(pub.warnings.join(), /ngoài mạng LAN/)
  assert.match(checkBaseUrl('http://localhost:11434').warnings.join(), /\/v1/)
  assert.deepEqual(checkBaseUrl('http://localhost:11434/v1').warnings, [])
})

test('isPrivateHost', () => {
  for (const h of ['localhost', '127.0.0.1', '10.1.2.3', '192.168.0.5', '172.16.0.1', '172.31.255.1', 'ollama', 'pc.local']) assert.equal(isPrivateHost(h), true, h)
  for (const h of ['172.32.0.1', '8.8.8.8', '169.254.169.254', 'api.example.com']) assert.equal(isPrivateHost(h), false, h)
})

test('changedKeys: sửa rồi trả về như cũ thì không tính', () => {
  assert.deepEqual(changedKeys(base, { 'llm.timeoutSec': 300 }), [])
  assert.deepEqual(changedKeys(base, { 'llm.timeoutSec': 600, 'llm.maxOutputTokens': 2048 }), ['llm.timeoutSec'])
})

test('toPatch chỉ gửi trường đã đổi, đúng nhóm', () => {
  const d: Draft = { ...base, 'llm.timeoutSec': 600, 'ollama.defaultModel': 'x' }
  assert.deepEqual(toPatch(['llm.timeoutSec', 'ollama.defaultModel'], d), { llm: { timeoutSec: 600 }, ollama: { defaultModel: 'x' } })
})

test('validateDraft', () => {
  assert.deepEqual(validateDraft(base), {})
  const e = validateDraft({ ...base, 'llm.timeoutSec': NaN, 'llm.maxOutputTokens': 0, 'ollama.defaultModel': ' ', 'ollama.baseUrl': 'http://a:b@h' })
  assert.deepEqual(Object.keys(e).sort(), ['llm.maxOutputTokens', 'llm.timeoutSec', 'ollama.baseUrl', 'ollama.defaultModel'])
  assert.ok(validateDraft({ ...base, 'llm.timeoutSec': 1.5 })['llm.timeoutSec'])
})

test('confirmNotes: chỉ hỏi khi đổi provider hoặc baseUrl', () => {
  assert.deepEqual(confirmNotes(base, ['llm.timeoutSec'], base), [])
  assert.match(confirmNotes(base, ['llm.provider'], { ...base, 'llm.provider': 'fake' })[0], /không gọi AI thật/)
  const d = { ...base, 'llm.provider': 'local' as const, 'ollama.baseUrl': ' http://10.0.0.2:11434/v1 ' }
  const n = confirmNotes({ ...base, 'llm.provider': 'fake' }, ['llm.provider', 'ollama.baseUrl'], d)
  assert.equal(n.length, 2)
  assert.match(n[0], /tính token/)
  assert.match(n[1], /sang http:\/\/10\.0\.0\.2:11434\/v1\./)
})

test('bật/tắt OmniRoute gửi cả hai cờ; địa chỉ OmniRoute chỉ kiểm khi đang dùng', () => {
  const off: Draft = { ...base, 'llm.viaOmniroute': false, 'omniroute.baseUrl': 'ftp://x' }
  assert.deepEqual(toPatch(['llm.viaOmniroute'], off), { llm: { viaOmniroute: false }, omniroute: { enabled: false } })
  assert.equal(validateDraft(off)['omniroute.baseUrl'], undefined)
  assert.ok(validateDraft({ ...off, 'llm.viaOmniroute': true })['omniroute.baseUrl'])
  assert.match(confirmNotes(base, ['omniroute.baseUrl'], { ...base, 'omniroute.baseUrl': 'http://10.0.0.9:20128/v1' })[0], /OmniRoute đổi/)
})

test('safeHttpUrl chỉ nhận http/https', () => {
  assert.equal(safeHttpUrl('http://localhost:20128'), 'http://localhost:20128/')
  assert.equal(safeHttpUrl('javascript:alert(1)'), null)
  assert.equal(safeHttpUrl('data:text/html,x'), null)
  assert.equal(safeHttpUrl('không phải url'), null)
})

test('bảng alias: dòng cố định đứng đầu, dòng tuỳ chỉnh theo sau', () => {
  assert.deepEqual(base['llm.modelAliases'], [
    { key: 'local.small', value: 'combo-a' }, { key: 'local.strong', value: '' }, { key: 'planner', value: 'combo-b' }, { key: 'extra', value: 'combo-c' },
  ])
  assert.deepEqual(aliasesToRecord(base['llm.modelAliases']), { 'local.small': 'combo-a', planner: 'combo-b', extra: 'combo-c' })
})

test('bảng alias: không đổi thì không tính là thay đổi; đổi thì gửi cả object', () => {
  const same = base['llm.modelAliases'].map((r) => ({ ...r }))
  assert.deepEqual(changedKeys(base, { 'llm.modelAliases': same }), [])
  const rows = [...same.slice(0, 3), { key: 'x1', value: 'combo-z' }]
  assert.deepEqual(changedKeys(base, { 'llm.modelAliases': rows }), ['llm.modelAliases'])
  assert.deepEqual(toPatch(['llm.modelAliases'], { ...base, 'llm.modelAliases': rows }), { llm: { modelAliases: { 'local.small': 'combo-a', planner: 'combo-b', x1: 'combo-z' } } })
})

test('aliasErrors: trùng, rỗng, ký tự lạ; dòng cố định được để trống', () => {
  const fixed = [{ key: 'local.small', value: '' }, { key: 'local.strong', value: '' }, { key: 'planner', value: '' }]
  assert.deepEqual(aliasErrors(fixed), [undefined, undefined, undefined])
  const e = aliasErrors([...fixed, { key: 'planner', value: 'a' }, { key: '', value: 'a' }, { key: 'có dấu cách', value: 'a' }, { key: 'ok', value: ' ' }])
  assert.match(e[3] ?? '', /trùng/)
  assert.match(e[4] ?? '', /để trống/)
  assert.match(e[5] ?? '', /Tên chỉ gồm/)
  assert.match(e[6] ?? '', /chọn combo/)
  assert.ok(validateDraft({ ...base, 'llm.modelAliases': [...fixed, { key: 'ok', value: '' }] })['llm.modelAliases'])
})

test('Hermes: địa chỉ chỉ kiểm khi bật; đổi địa chỉ/planner có xác nhận; token không nằm trong nháp', () => {
  const off: Draft = { ...base, 'hermes.enabled': false, 'hermes.baseUrl': 'ftp://x' }
  assert.equal(validateDraft(off)['hermes.baseUrl'], undefined)
  assert.ok(validateDraft({ ...off, 'hermes.enabled': true })['hermes.baseUrl'])
  assert.match(confirmNotes(base, ['hermes.baseUrl'], { ...base, 'hermes.baseUrl': 'http://10.0.0.5:8642' })[0], /Hermes đổi/)
  assert.match(confirmNotes(base, ['hermes.planner'], { ...base, 'hermes.planner': 'llm' })[0], /LLM thường/)
  assert.deepEqual(toPatch(['hermes.enabled', 'hermes.planner'], { ...base, 'hermes.enabled': false, 'hermes.planner': 'llm' }), { hermes: { enabled: false, planner: 'llm' } })
})
