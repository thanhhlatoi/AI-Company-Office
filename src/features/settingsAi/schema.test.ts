import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SettingsAiSchema, StatusSchema, TestResultSchema } from '../../types/settingsAi.ts'

const valid = {
  applyMode: 'live', source: 'database',
  llm: { provider: 'local', baseUrl: 'http://localhost:20128/v1', model: 'local.small', reasoningEffort: 'none', timeoutSec: 300, maxOutputTokens: 2048, apiKeySet: true, viaOmniroute: true, modelAliases: { planner: 'combo-a' } },
  ollama: { baseUrl: 'http://192.168.1.184:11434/v1', defaultModel: 'qwen3.6-64k:latest' },
  omniroute: { enabled: true, baseUrl: 'http://localhost:20128/v1', dashboardUrl: 'http://localhost:20128', apiKeySet: false },
  hermes: { enabled: true, planner: 'hermes', baseUrl: 'http://localhost:8642', healthy: null, adminConfigured: false },
}

test('response đúng định dạng được chấp nhận', () => {
  assert.equal(SettingsAiSchema.safeParse(valid).success, true)
})

test('response sai định dạng bị từ chối', () => {
  assert.equal(SettingsAiSchema.safeParse({ ...valid, applyMode: 'sometimes' }).success, false)
  assert.equal(SettingsAiSchema.safeParse({ ...valid, llm: null }).success, false)
})

test('khoá bí mật BE lỡ trả về không lọt vào dữ liệu đã parse', () => {
  const leaky = { ...valid, llm: { ...valid.llm, apiKey: 'sk-secret' }, omniroute: { ...valid.omniroute, apiKey: 'sk-secret2' }, apiKey: 'sk-secret3' }
  const out = SettingsAiSchema.parse(leaky)
  assert.doesNotMatch(JSON.stringify(out), /sk-secret/)
})

test('test/status schema', () => {
  assert.equal(TestResultSchema.safeParse({ ok: true, latencyMs: 12, message: 'ok', models: ['a'] }).success, true)
  assert.equal(TestResultSchema.safeParse({ ok: 'yes' }).success, false)
  const h = { state: 'up', checkedAt: 'x' }
  assert.equal(StatusSchema.safeParse({ ollama: h, omniroute: h, llm: h, hermes: h }).success, true)
  assert.equal(StatusSchema.safeParse({ ollama: { state: 'great', checkedAt: 'x' }, omniroute: h, llm: h, hermes: h }).success, false)
})

test('routeText nói đúng đường đi', async () => {
  const { routeText } = await import('./routeText.ts')
  assert.match(routeText({ provider: 'local', viaOmniroute: true }), /OmniRoute → Ollama/)
  assert.match(routeText({ provider: 'local', viaOmniroute: false }), /trực tiếp Ollama/)
  assert.match(routeText({ provider: 'fake', viaOmniroute: true }), /AI giả/)
})
