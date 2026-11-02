import assert from 'node:assert/strict'
import { test } from 'node:test'
import { missingVariables, renderTemplate } from './template.ts'

const t = { systemPrompt: 'Bạn của {{company}} / {{ lạ }} / {{name}}', variables: [{ key: 'company', label: 'Công ty', default: 'ACME', required: true }, { key: 'name', label: 'Tên', default: '', required: true }] }

test('thay biến, dùng mặc định, giữ biến lạ', () => {
  assert.equal(renderTemplate(t, { name: 'Lan' }), 'Bạn của ACME / {{ lạ }} / Lan')
  assert.equal(renderTemplate(t, { company: 'X', name: 'Y' }), 'Bạn của X / {{ lạ }} / Y')
})
test('biến bắt buộc còn thiếu', () => {
  assert.deepEqual(missingVariables(t, {}).map((v) => v.key), ['name'])
  assert.deepEqual(missingVariables(t, { name: ' ' }).map((v) => v.key), ['name'])
  assert.deepEqual(missingVariables(t, { name: 'Lan' }), [])
})
