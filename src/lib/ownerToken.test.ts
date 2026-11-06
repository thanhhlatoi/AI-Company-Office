import assert from 'node:assert/strict'
import { test } from 'node:test'
import { authHeaders, needsOwnerToken } from './ownerToken.ts'

test('chỉ nhóm cài đặt AI mới mang mã chủ', () => {
  for (const p of ['/settings/ai', '/settings/ai/status', '/settings/ai/models?source=ollama', '/settings/ai/test']) assert.ok(needsOwnerToken(p), p)
  for (const p of ['/agents', '/hermes/status', '/settings', '/settings/aix', '/goals', '/agents/a1/hermes/skills']) assert.ok(!needsOwnerToken(p), p)
})

test('header Authorization chỉ có khi vừa có mã vừa đúng đường dẫn', () => {
  assert.deepEqual(authHeaders('/settings/ai', 'tok'), { Authorization: 'Bearer tok' })
  assert.deepEqual(authHeaders('/settings/ai', null), {})
  assert.deepEqual(authHeaders('/agents', 'tok'), {})
  assert.deepEqual(authHeaders('/hermes/sync-all', 'tok'), {})
})
