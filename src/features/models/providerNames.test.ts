import assert from 'node:assert/strict'
import { test } from 'node:test'
import { providerName } from './providerNames.ts'

test('tiền tố đã biết hiện tên đầy đủ, tiền tố lạ giữ nguyên', () => {
  assert.equal(providerName('cx'), 'OpenAI Codex')
  assert.equal(providerName('ollama'), 'Ollama Cloud')
  assert.equal(providerName('moi-ra'), 'moi-ra')
})

test('cloud hay local: chỉ ollama-local và local-device là local; Ollama Cloud là cloud', async () => {
  const { isLocalProvider } = await import('./providerNames.ts')
  assert.equal(isLocalProvider('ollama-local'), true)
  assert.equal(isLocalProvider('ollama'), false)
  assert.equal(isLocalProvider('cx'), false)
})

test('providerPlan và providerInitials', async () => {
  const { providerPlan, providerInitials } = await import('./providerNames.ts')
  assert.match(providerPlan('cx') ?? '', /OAuth/)
  assert.equal(providerPlan('moi-ra'), null)
  assert.equal(providerInitials('cx'), 'OP')
  assert.equal(providerInitials('moi-ra'), 'MO')
})
