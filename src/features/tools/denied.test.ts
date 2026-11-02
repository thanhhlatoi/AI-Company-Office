import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupDenied, targetOf } from './denied.ts'

const c = (id: string, to: string, extra = {}) => ({ id, at: `2026-11-0${id}T10:00:00Z`, agentId: 'a1', toolId: 'email_send', reason: 'Miền nhận "x" không nằm trong danh sách', taskId: `t${id}`, args: { to }, ...extra })

test('đích của lời gọi', () => {
  assert.equal(targetOf({ to: 'a@evil.net' }), 'evil.net')
  assert.equal(targetOf({ url: 'https://x.org/a' }), 'x.org')
  assert.equal(targetOf({ payee: 'ABC' }), 'ABC')
  assert.equal(targetOf({}), null)
})
test('gom theo agent + công cụ + lý do (bỏ phần trong ngoặc kép), nhiều đích lạ -> nghi bị lừa', () => {
  const g = groupDenied([c('1', 'a@e1.net'), c('2', 'b@e2.net'), c('3', 'c@e1.net'), c('4', 'a@acme.com', { agentId: 'a2' })])
  assert.equal(g.length, 2)
  assert.equal(g[0].count, 3); assert.equal(g[0].suspicious, true); assert.deepEqual(g[0].targets, ['e1.net', 'e2.net'])
  assert.equal(g[1].suspicious, false)
})
test('bị chặn nhiều lần nhưng cùng một đích -> chỉ là thiếu quyền, không nghi', () => {
  const g = groupDenied([c('1', 'a@e1.net'), c('2', 'b@e1.net'), c('3', 'c@e1.net')])
  assert.equal(g[0].suspicious, false)
})
